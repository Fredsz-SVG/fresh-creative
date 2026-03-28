import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const creditsSyncInvoice = new Hono()

creditsSyncInvoice.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const adminClient = getAdminSupabaseClient(c?.env as any)

    const { data: pendingRows } = await adminClient
      .from('transactions')
      .select('id, external_id, package_id, amount')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')

    if (!pendingRows?.length) {
      return c.json({ synced: 0 })
    }

    const xenditKey = (c.env as any).XENDIT_SECRET_KEY || ''
    const auth = btoa(xenditKey + ':')
    let synced = 0

    for (const row of pendingRows) {
      const externalId = row.external_id
      if (!externalId) continue

      try {
        const res = await fetch(`https://api.xendit.co/v2/invoices?external_id=${externalId}`, {
          headers: { 'Authorization': 'Basic ' + auth }
        })
        const invoicesRaw = await res.json() as any
        const invoice = Array.isArray(invoicesRaw) ? invoicesRaw[0] : invoicesRaw

        const invStatus = (invoice?.status ?? '').toUpperCase()

        const specificChannel = invoice?.payment_channel || invoice?.bank_code || invoice?.retail_outlet_name || invoice?.ewallet_type
        const paymentMethod = specificChannel || invoice?.payment_method || null

        if (invStatus !== 'PAID' && invStatus !== 'SETTLED') continue

        const isPackage = externalId.startsWith('pkg_')
        const isAlbum = externalId.startsWith('album_')

        if (isPackage) {
          const match = externalId.match(/^pkg_(.+?)_user_(.+?)_ts_/)
          if (!match) continue
          const packageId = match[1]
          const userId = match[2]

          const { data: pkg } = await adminClient
            .from('credit_packages')
            .select('credits')
            .eq('id', packageId)
            .single()

          if (!pkg) continue

          await adminClient
            .from('transactions')
            .update({
              status: invStatus,
              payment_method: paymentMethod,
              paid_at: new Date().toISOString(),
            })
            .eq('external_id', externalId)

          const { data: userRow } = await adminClient
            .from('users')
            .select('credits')
            .eq('id', userId)
            .single()

          const newCredits = (userRow?.credits ?? 0) + (pkg.credits ?? 0)
          await adminClient.from('users').update({ credits: newCredits }).eq('id', userId)
          synced++
        } else if (isAlbum) {
          const match = externalId.match(/^album_(.+?)_user_(.+?)_ts_/)
          if (!match) continue
          const albumId = match[1]

          const { data: txData } = await adminClient
            .from('transactions')
            .update({
              status: invStatus,
              payment_method: paymentMethod,
              paid_at: new Date().toISOString(),
            })
            .eq('external_id', externalId)
            .select('new_students_count, amount')
            .single()

          const albumUpdates: Record<string, unknown> = { payment_status: 'paid' }
          if (txData?.new_students_count) {
            albumUpdates.students_count = txData.new_students_count
            albumUpdates.total_estimated_price = txData.amount
          }
          await adminClient.from('albums').update(albumUpdates).eq('id', albumId)

          synced++
        }
      } catch (e) {
        console.warn('Sync invoice failed for', externalId, e)
      }
    }

    return c.json({ synced })
  } catch (error: unknown) {
    console.error('Sync invoice error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Sync failed' }, 500)
  }
})

export default creditsSyncInvoice