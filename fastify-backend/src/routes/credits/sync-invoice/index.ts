import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply: any) => {

    try {
      const supabase = getSupabaseClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      const adminClient = getAdminSupabaseClient()

      const { data: pendingRows } = await adminClient
        .from('transactions')
        .select('id, external_id, package_id, amount')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')

      if (!pendingRows?.length) {
        return reply.code(500).send({ synced: 0 })
      }

      let synced = 0

      for (const row of pendingRows) {
        const externalId = row.external_id
        if (!externalId) continue

        try {
          const auth = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
          const res = await fetch(`https://api.xendit.co/v2/invoices?external_id=${externalId}`, {
            headers: { 'Authorization': 'Basic ' + auth }
          });
          const invoicesRaw = await res.json();
          const invoice = Array.isArray(invoicesRaw) ? invoicesRaw[0] : invoicesRaw;

          const invStatus = (invoice?.status ?? '').toUpperCase()

          // Prioritaskan spesifik channel (BCA, ALFAMART, OVO) daripada kategori umum (BANK_TRANSFER)
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
            const userId = match[2]

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
            await adminClient
              .from('albums')
              .update(albumUpdates)
              .eq('id', albumId)

            synced++
          }
        } catch (e) {
          console.warn('Sync invoice failed for', externalId, e)
        }
      }

      return reply.send({ synced })
    } catch (error: unknown) {
      console.error('Sync invoice error:', error)
      return reply.code(500).send({ error: error instanceof Error ? error.message : 'Sync failed' })
    }

  })

}

export default route
