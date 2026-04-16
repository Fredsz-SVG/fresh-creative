import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'
import { getCreditsFromSupabase, mirrorCreditsToD1, setCreditsInSupabase } from '../../lib/credits'

const webhooksXendit = new Hono()

// POST /api/webhooks/xendit
webhooksXendit.post('/', async (c) => {
  const payload = await c.req.json()
  const raw = payload?.data ?? payload
  const status = (raw?.status ?? payload?.status ?? '').toUpperCase()
  const externalId = raw?.external_id ?? payload?.external_id
  const specificChannel =
    raw?.payment_channel || raw?.bank_code || raw?.retail_outlet_name || raw?.ewallet_type
  const paymentMethod = specificChannel || raw?.payment_method || null

  if (!externalId) {
    return c.json({ error: 'No external_id provided' }, 400)
  }

  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  if (status === 'EXPIRED') {
    const tx = await db
      .prepare(`SELECT album_id, access_id FROM transactions WHERE external_id = ?`)
      .bind(externalId)
      .first<{ album_id: string | null; access_id: string | null }>()

    await db
      .prepare(
        `UPDATE transactions SET status = ?, updated_at = datetime('now') WHERE external_id = ?`
      )
      .bind(status, externalId)
      .run()

    if (tx) {
      if (tx.album_id && externalId.startsWith('album_')) {
        await db
          .prepare(`UPDATE albums SET payment_url = NULL, updated_at = datetime('now') WHERE id = ? AND payment_url IS NOT NULL`)
          .bind(tx.album_id)
          .run()
      }
      if (tx.access_id && externalId.startsWith('member_')) {
        await db
          .prepare(`UPDATE album_class_access SET payment_status = 'failed', payment_transaction_id = NULL, updated_at = datetime('now') WHERE id = ? AND payment_status = 'pending'`)
          .bind(tx.access_id)
          .run()
      }
    }

    return c.json({ message: 'Transaction expired handled successfully' }, 200)
  }

  if (status !== 'PAID' && status !== 'SETTLED') {
    return c.json({ message: 'Ignored, unhandled status', received: status })
  }

  const isPackage = externalId.startsWith('pkg_')
  const isAlbum = externalId.startsWith('album_')
  const isMember = externalId.startsWith('member_')

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
      .prepare(
        `SELECT package_id, album_id, new_students_count, amount, access_id FROM transactions WHERE external_id = ?`
      )
      .bind(externalId)
      .first<{
        package_id: string | null
        album_id: string | null
        new_students_count: number | null
        amount: number
        access_id: string | null
      }>()

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
          const currentCredits = await getCreditsFromSupabase(
            c.env as Record<string, string>,
            userId.user_id
          ).catch(async () => {
            const row = await db
              .prepare(`SELECT credits FROM users WHERE id = ?`)
              .bind(userId.user_id)
              .first<{ credits: number | null }>()
            return row?.credits ?? 0
          })
          const nextCredits = currentCredits + pkg.credits
          // Source of truth: Supabase
          await setCreditsInSupabase(c.env as Record<string, string>, userId.user_id, nextCredits)
          await mirrorCreditsToD1(db, userId.user_id, nextCredits)
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

    if (txRow?.album_id && txRow?.access_id && isMember) {
      await db
        .prepare(
          `UPDATE album_class_access
           SET has_paid = 1, payment_status = 'paid', updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(txRow.access_id)
        .run()
    }

    return c.json({
      message: 'Webhook processed',
      status,
      externalId,
      paymentMethod,
      isPackage,
      isAlbum,
      isMember,
    })
  }

  // Ignore non-terminal statuses
  return c.json({
    message: 'Webhook received',
    status,
    externalId,
    paymentMethod,
    isPackage,
    isAlbum,
    isMember,
  })
})

export default webhooksXendit
