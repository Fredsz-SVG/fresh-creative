import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'
import { mirrorUserCreditsToSupabase } from '../../lib/supabase-user-mirror'

const webhooksXendit = new Hono()

// POST /api/webhooks/xendit
webhooksXendit.post('/', async (c) => {
  const payload = await c.req.json()
  const raw = payload?.data ?? payload
  const status = (raw?.status ?? payload?.status ?? '').toUpperCase()
  const externalId = raw?.external_id ?? payload?.external_id
  const specificChannel = raw?.payment_channel || raw?.bank_code || raw?.retail_outlet_name || raw?.ewallet_type
  const paymentMethod = specificChannel || raw?.payment_method || null

  if (!externalId) {
    return c.json({ error: 'No external_id provided' }, 400)
  }

  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  if (status === 'EXPIRED') {
    await db
      .prepare(`UPDATE transactions SET status = ?, updated_at = datetime('now') WHERE external_id = ?`)
      .bind(status, externalId)
      .run()
    return c.json({ message: 'Transaction expired handled successfully' }, 400)
  }

  if (status !== 'PAID' && status !== 'SETTLED') {
    return c.json({ message: 'Ignored, unhandled status', received: status })
  }

  const isPackage = externalId.startsWith('pkg_')
  const isAlbum = externalId.startsWith('album_')

  // Update for terminal statuses
  if (status === 'PAID' || status === 'SETTLED') {
    await db
      .prepare(
        `UPDATE transactions
         SET status = ?, payment_method = ?, paid_at = datetime('now'), updated_at = datetime('now')
         WHERE external_id = ?`
      )
      .bind(status, paymentMethod, externalId)
      .run()

    const txRow = await db
      .prepare(`SELECT package_id, album_id, new_students_count, amount FROM transactions WHERE external_id = ?`)
      .bind(externalId)
      .first<{ package_id: string | null; album_id: string | null; new_students_count: number | null; amount: number }>()

    if (txRow?.package_id && isPackage) {
      const pkg = await db
        .prepare(`SELECT credits FROM credit_packages WHERE id = ?`)
        .bind(txRow.package_id)
        .first<{ credits: number }>()

      if (pkg?.credits) {
        const userId = await db
          .prepare(`SELECT user_id FROM transactions WHERE external_id = ?`)
          .bind(externalId)
          .first<{ user_id: string }>()

        if (userId?.user_id) {
          const userRow = await db
            .prepare(`SELECT credits FROM users WHERE id = ?`)
            .bind(userId.user_id)
            .first<{ credits: number | null }>()

          const currentCredits = userRow?.credits ?? 0
          const nextCredits = currentCredits + pkg.credits
          await db
            .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(nextCredits, userId.user_id)
            .run()

          // Mirror to Supabase `public.users.credits` (source of truth)
          try {
            await mirrorUserCreditsToSupabase(c?.env as Record<string, string>, userId.user_id, nextCredits)
          } catch {
            // ignore
          }
        }
      }
    }

    if (txRow?.album_id && isAlbum) {
      if (typeof txRow.new_students_count === 'number' && txRow.new_students_count > 0) {
        await db
          .prepare(
            `UPDATE albums
             SET payment_status = 'paid', students_count = ?, total_estimated_price = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(txRow.new_students_count, txRow.amount, txRow.album_id)
          .run()
      } else {
        await db
          .prepare(
            `UPDATE albums
             SET payment_status = 'paid', total_estimated_price = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(txRow.amount, txRow.album_id)
          .run()
      }
    }

    return c.json({
      message: 'Webhook processed',
      status,
      externalId,
      paymentMethod,
      isPackage,
      isAlbum,
    })
  }

  // Ignore non-terminal statuses
  return c.json({ message: 'Webhook received', status, externalId, paymentMethod, isPackage, isAlbum })
})

export default webhooksXendit
