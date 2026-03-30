import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'

const checkoutRoute = new Hono()

checkoutRoute.post('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    if (!albumId) return c.json({ error: 'Album ID required' }, 400)

    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const album = await db.prepare(`SELECT * FROM albums WHERE id = ?`).bind(albumId).first<Record<string, unknown>>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    if (album.user_id !== user.id) {
      if ((await getRole(c, user)) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    }

    if (album.status !== 'approved') return c.json({ error: 'Album must be approved before payment' }, 400)

    const body = await c.req.json().catch(() => ({}))
    const isUpgradeRequest = body.upgrade === true

    if (album.payment_status === 'paid' && !isUpgradeRequest) {
      return c.json({ error: 'Album already paid' }, 400)
    }

    const amount = isUpgradeRequest ? (body.amount || 0) : album.total_estimated_price
    if (!amount || (amount as number) <= 0) return c.json({ error: 'Invalid album price' }, 400)

    const existingTx = await db
      .prepare(
        `SELECT invoice_url FROM transactions WHERE album_id = ? AND status = 'PENDING' AND amount = ? ORDER BY created_at DESC LIMIT 1`
      )
      .bind(albumId, amount)
      .first<{ invoice_url: string | null }>()

    if (existingTx?.invoice_url) {
      const url = existingTx.invoice_url
      const isStubbed = url.includes('stubbed-url') || url.includes('sandbox.xendit.co')
      if (!isStubbed) return c.json({ invoiceUrl: url })
      // Abaikan transaksi stub lama (hindari browser membuka domain yang tidak resolve).
      await db
        .prepare(`UPDATE transactions SET status = 'FAILED', updated_at = datetime('now') WHERE album_id = ? AND invoice_url = ? AND status = 'PENDING'`)
        .bind(albumId, url)
        .run()
    }

    const externalId = `album_${album.id}_user_${user.id}_ts_${Date.now()}`
    const txId = crypto.randomUUID()
    const desc = isUpgradeRequest
      ? `Penambahan ${body.added_students || 0} Anggota Album: ${album.name}`
      : `Pembayaran Album: ${album.name}`

    const xenditKey = (c.env as { XENDIT_SECRET_KEY?: string }).XENDIT_SECRET_KEY || ''
    if (!xenditKey) return c.json({ error: 'XENDIT_SECRET_KEY missing' }, 500)

    const baseUrl = (c.env as { NEXT_PUBLIC_APP_URL?: string }).NEXT_PUBLIC_APP_URL || ''
    const isAdmin = (await getRole(c, user)) === 'admin'
    const redirectPath = isAdmin ? '/admin/riwayat' : '/user/riwayat'

    const invoicePayload: Record<string, unknown> = {
      external_id: externalId,
      amount: amount,
      currency: 'IDR',
      description: desc,
      success_redirect_url: `${baseUrl}${redirectPath}?status=success`,
      failure_redirect_url: `${baseUrl}${redirectPath}?status=failed`,
      items: [
        {
          name: `${album.name} Album Payment`,
          quantity: 1,
          price: amount,
        },
      ],
    }

    if (user.email) {
      invoicePayload.payer_email = user.email
      invoicePayload.customer = {
        given_names: user.user_metadata?.full_name || 'Customer',
        email: user.email,
      }
    }

    const auth = btoa(xenditKey + ':')
    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    })
    const invoice = (await xenditRes.json()) as { message?: string; invoice_url?: string; status?: string }

    if (!xenditRes.ok) {
      console.error('Xendit album checkout error:', invoice)
      return c.json({ error: invoice?.message || 'Failed to create invoice' }, 500)
    }

    const invoiceUrl = invoice.invoice_url
    if (!invoiceUrl) return c.json({ error: 'Xendit did not return invoice_url' }, 500)

    await db
      .prepare(
        `INSERT INTO transactions (id, user_id, external_id, album_id, amount, status, invoice_url, description, new_students_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        txId,
        user.id,
        externalId,
        albumId,
        amount,
        invoiceUrl,
        desc,
        body.new_students_count ?? null
      )
      .run()

    await db
      .prepare(`UPDATE albums SET payment_url = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(invoiceUrl, albumId)
      .run()
    return c.json({ invoiceUrl })
  } catch (error: unknown) {
    console.error('Album checkout error:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default checkoutRoute
