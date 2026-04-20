import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'
import { publishRealtimeEventFromContext } from '../../../lib/realtime'

const memberCheckoutRoute = new Hono()

memberCheckoutRoute.post('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    if (!albumId) return c.json({ error: 'Album ID required' }, 400)

    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json().catch(() => ({}))
    const { access_id } = body
    if (!access_id) return c.json({ error: 'Access ID required' }, 400)

    // Verify access exists, belongs to user, and is unpaid
    const access = await db
      .prepare(`SELECT * FROM album_class_access WHERE id = ? AND album_id = ? AND user_id = ?`)
      .bind(access_id, albumId, user.id)
      .first<Record<string, unknown>>()

    if (!access) return c.json({ error: 'Access record not found' }, 404)
    if (access.has_paid) return c.json({ error: 'Already paid' }, 400)
    if (access.status !== 'approved') return c.json({ error: 'Access not approved yet' }, 400)

    // Get album and package price
    const album = await db
      .prepare(
        `
        SELECT a.name, a.individual_payments_enabled, a.package_snapshot
        FROM albums a
        WHERE a.id = ?
      `
      )
      .bind(albumId)
      .first<{ name: string; individual_payments_enabled?: number; package_snapshot?: string }>()

    if (!album) return c.json({ error: 'Album not found' }, 404)
    if (album.individual_payments_enabled === 0) {
      return c.json({ error: 'Album does not require individual payments' }, 400)
    }

    let amount = 0
    const lineItems: Array<{ name: string; quantity: number; price: number }> = []

    if (album.package_snapshot) {
      try {
        const pkg = JSON.parse(album.package_snapshot)
        if (pkg.price_per_student) {
          const baseP = Number(pkg.price_per_student)
          lineItems.push({
            name: `Paket Dasar`,
            quantity: 1,
            price: baseP,
          })
          amount += baseP
        }

        if (pkg.features && Array.isArray(pkg.features)) {
          for (const f of pkg.features) {
            try {
              const j = typeof f === 'string' ? JSON.parse(f) : f
              if (j.price > 0 || Number(j.price) > 0) {
                const addonP = Number(j.price)
                lineItems.push({
                  name: `Add-on: ${j.name}`,
                  quantity: 1,
                  price: addonP,
                })
                amount += addonP
              }
            } catch {
              /* ignore individual addon parse error */
            }
          }
        }
      } catch {
        /* ignore snapshot parse error */
      }
    }

    if (amount <= 0) {
      // Fallback if price calculation failed but we have a snapshot price field (unexpected but safe)
      const snapshot = JSON.parse(album.package_snapshot || '{}') as { price_per_student: number }
      amount = snapshot.price_per_student || 0
      if (lineItems.length === 0) {
        lineItems.push({
          name: `${album.name} Access Payment`,
          quantity: 1,
          price: amount,
        })
      }
    }

    if (amount <= 0) {
      // If free, just approve immediately
      await db
        .prepare(
          `UPDATE album_class_access SET has_paid = 1, payment_status = 'paid', updated_at = datetime('now') WHERE id = ?`
        )
        .bind(access_id)
        .run()
      return c.json({ free: true, message: 'Free access granted' })
    }

    const externalId = `member_${access_id}_user_${user.id}_ts_${Date.now()}`
    const txId = crypto.randomUUID()
    const desc = `Pembayaran Akses Anggota Album: ${album.name}`

    const xenditKey = (c.env as { XENDIT_SECRET_KEY?: string }).XENDIT_SECRET_KEY || ''
    if (!xenditKey) return c.json({ error: 'XENDIT_SECRET_KEY missing' }, 500)

    const baseUrl = (c.env as { NEXT_PUBLIC_APP_URL?: string }).NEXT_PUBLIC_APP_URL || ''
    const redirectPath = '/user/riwayat' // Member dashboard or history

    const invoicePayload: Record<string, unknown> = {
      external_id: externalId,
      amount: amount,
      currency: 'IDR',
      description: desc,
      success_redirect_url: `${baseUrl}${redirectPath}?status=success`,
      failure_redirect_url: `${baseUrl}${redirectPath}?status=failed`,
      items: lineItems,
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

    const invoice = (await xenditRes.json()) as { message?: string; invoice_url?: string }
    if (!xenditRes.ok) {
      return c.json({ error: invoice?.message || 'Failed to create invoice' }, 500)
    }

    const invoiceUrl = invoice.invoice_url
    if (!invoiceUrl) return c.json({ error: 'Xendit did not return invoice_url' }, 500)

    // Store transaction with access_id
    await db
      .prepare(
        `INSERT INTO transactions (id, user_id, external_id, album_id, amount, status, invoice_url, description, access_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(txId, user.id, externalId, albumId, amount, invoiceUrl, desc, access_id)
      .run()

    // Mark as pending
    await db
      .prepare(
        `UPDATE album_class_access SET payment_status = 'pending', payment_transaction_id = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(txId, access_id)
      .run()

    void publishRealtimeEventFromContext(c, {
      type: 'album.classAccess.updated',
      channel: 'global',
      payload: {
        path: `/api/albums/${albumId}/join-requests`,
        albumId,
        accessId: access_id,
        paymentStatus: 'pending',
      },
      ts: new Date().toISOString(),
    })

    return c.json({ invoiceUrl })
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default memberCheckoutRoute
