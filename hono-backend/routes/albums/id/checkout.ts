import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const checkoutRoute = new Hono()

checkoutRoute.post('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    if (!albumId) return c.json({ error: 'Album ID required' }, 400)

    const supabase = getSupabaseClient(c)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const adminSupabase = getAdminSupabaseClient(c?.env as any)
    const { data: album, error: albumError } = await adminSupabase.from('albums').select('*').eq('id', albumId).single()
    if (albumError || !album) return c.json({ error: 'Album not found' }, 404)

    if (album.user_id !== user.id) {
      const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    }

    if (album.status !== 'approved') return c.json({ error: 'Album must be approved before payment' }, 400)

    const body = await c.req.json().catch(() => ({}))
    const isUpgradeRequest = body.upgrade === true

    if (album.payment_status === 'paid' && !isUpgradeRequest) {
      return c.json({ error: 'Album already paid' }, 400)
    }

    const amount = isUpgradeRequest ? (body.amount || 0) : album.total_estimated_price
    if (!amount || amount <= 0) return c.json({ error: 'Invalid album price' }, 400)

    const { data: existingTx } = await adminSupabase.from('transactions').select('*')
      .eq('album_id', albumId).eq('status', 'PENDING').eq('amount', amount)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (existingTx?.invoice_url) return c.json({ invoiceUrl: existingTx.invoice_url })

    // Xendit integration is not supported on Cloudflare Workers (Node.js only)
    // The following is a placeholder for production use:
    // const { Xendit } = await import('xendit-node')
    // ...
    // const invoice = await Invoice.createInvoice({ data: invoiceData })
    // ...
    // For now, return a stubbed invoiceUrl
    const invoiceUrl = 'https://sandbox.xendit.co/invoice/stubbed-url'

    const txRecord: Record<string, unknown> = {
      user_id: user.id, external_id: `album_${album.id}_user_${user.id}_ts_${Date.now()}`,
      album_id: albumId, amount, status: 'PENDING', invoice_url: invoiceUrl,
    }

    const { error: insertErr1 } = await adminSupabase.from('transactions').insert([{
      ...txRecord, description: isUpgradeRequest ? `Penambahan ${body.added_students || 0} Anggota Album: ${album.name}` : `Pembayaran Album: ${album.name}`,
      new_students_count: body.new_students_count || null,
    }])
    if (insertErr1) {
      const { error: insertErr2 } = await adminSupabase.from('transactions').insert([txRecord])
      if (insertErr2) console.error('DB Insert Error:', insertErr2.message)
    }

    await adminSupabase.from('albums').update({ payment_url: invoiceUrl }).eq('id', albumId)
    return c.json({ invoiceUrl })
  } catch (error: any) {
    console.error('Album checkout error:', error)
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default checkoutRoute
