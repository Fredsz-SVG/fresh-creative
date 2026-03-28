import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../../lib/supabase'

const webhooksXendit = new Hono()

// POST /api/webhooks/xendit
webhooksXendit.post('/', async (c) => {
  // WARNING: process.env is not available in Cloudflare Workers. Use environment bindings instead.
  // This is a stub. You must adapt secret/token validation for Workers.
  // See: https://developers.cloudflare.com/workers/platform/environment-variables/
  // const xenditWebhookToken = process.env.XENDIT_WEBHOOK_TOKEN
  // const callbackToken = c.req.header('x-callback-token')
  // if (xenditWebhookToken && callbackToken !== xenditWebhookToken) {
  //   return c.json({ error: 'Unauthorized webhook' }, 401)
  // }

  // Parse payload
  const payload = await c.req.json()
  // console.log('Received Xendit Webhook:', JSON.stringify(payload).slice(0, 500))
  const raw = payload?.data ?? payload
  const status = (raw?.status ?? payload?.status ?? '').toUpperCase()
  const externalId = raw?.external_id ?? payload?.external_id
  const specificChannel = raw?.payment_channel || raw?.bank_code || raw?.retail_outlet_name || raw?.ewallet_type
  const paymentMethod = specificChannel || raw?.payment_method || null

  if (!externalId) {
    // console.warn('Xendit webhook: no external_id in payload', payload)
    return c.json({ error: 'No external_id provided' }, 400)
  }

  const supabase = getAdminSupabaseClient(c?.env as any)

  // If status EXPIRED, update DB transaction to EXPIRED but do not topup
  if (status === 'EXPIRED') {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status })
      .eq('external_id', externalId)
    // if (txError) console.warn('Could not update expired status:', txError)
    return c.json({ message: 'Transaction expired handled successfully' }, 400)
  }

  // If not PAID or SETTLED (and not EXPIRED), ignore
  if (status !== 'PAID' && status !== 'SETTLED') {
    return c.json({ message: 'Ignored, unhandled status', received: status })
  }

  // Parse externalId: pkg_<pkgId>_user_<userId>_ts_<timestamp> or album_<albumId>_user_<userId>_ts_<timestamp>
  const isPackage = externalId.startsWith('pkg_')
  const isAlbum = externalId.startsWith('album_')

  // NOTE: The rest of the logic (crediting user, updating album, etc.) must be ported and tested for Workers.
  // For now, this is a stub for Cloudflare Workers compatibility.
  return c.json({ message: 'Webhook received (stub for Workers)', status, externalId, paymentMethod })
})

export default webhooksXendit