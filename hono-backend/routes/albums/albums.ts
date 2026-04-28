import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'
import { requireAuthJwt } from '../../middleware'
import { invalidateUserResponseCaches } from '../../lib/user-response-cache'

const albumColsUser = `a.id, a.user_id, a.name, a.type, a.status, a.created_at, a.description, a.cover_image_url, a.cover_image_position, a.pricing_package_id, a.payment_status, a.payment_url, a.total_estimated_price, a.pic_name, a.individual_payments_enabled, a.package_snapshot, (SELECT SUM(amount) FROM transactions WHERE album_id = a.id AND status IN ('PAID', 'SETTLED')) as collected_amount`

interface HonoUser {
  id: string
  role: string
}

interface PackageData {
  name: string
  price_per_student: number
  min_students: number
  features: string
  flipbook_enabled: number | boolean
  ai_labs_features: string
}

function mapAlbumRow(r: Record<string, unknown>) {
  const rest = { ...r }
  let snapshot = null
  if (rest.package_snapshot) {
    if (typeof rest.package_snapshot === 'object') {
      snapshot = rest.package_snapshot
    } else {
      try {
        snapshot =
          typeof rest.package_snapshot === 'string'
            ? JSON.parse(rest.package_snapshot)
            : rest.package_snapshot
      } catch {
        console.error('FAILED TO PARSE', rest.package_snapshot)
        snapshot = null
      }
    }
  }
  delete (rest as { package_snapshot?: unknown }).package_snapshot
  return { ...rest, package_snapshot: snapshot }
}

const albumsRoute = new Hono<{ Variables: { user: HonoUser } }>()

albumsRoute.get('/', requireAuthJwt, async (c) => {
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const user = c.get('user')
    const userId = user?.id
    const role = user?.role || 'member'

    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    const isAdmin = role === 'admin'
    const scope = c.req.query('scope')
    const shouldUseAdminScope = isAdmin && scope !== 'mine'

    if (shouldUseAdminScope) {
      const { results } = await db
        .prepare(
          `SELECT a.id, a.name, a.type, a.status, a.created_at, a.description, a.cover_image_url, a.cover_image_position, a.pricing_package_id, a.school_city, a.kab_kota, a.wa_e164, a.province_id, a.province_name, a.pic_name, a.students_count, a.source, a.total_estimated_price, a.payment_status, a.payment_url, a.package_snapshot, (SELECT SUM(amount) FROM transactions WHERE album_id = a.id AND status IN ('PAID', 'SETTLED')) as collected_amount FROM albums a ORDER BY a.created_at DESC`
        )
        .all<Record<string, unknown>>()
      const rows = results ?? []
      const result = rows.map((a) => {
        const m = mapAlbumRow(a)
        return { ...m, isOwner: false }
      })
      return c.json(result)
    }

    const { results } = await db
      .prepare(
        `SELECT ${albumColsUser},
            (SELECT id FROM album_class_access aca WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved' LIMIT 1) AS member_access_id,
            (SELECT payment_status FROM album_class_access aca WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved' LIMIT 1) AS member_payment_status,
            CASE WHEN a.user_id = ? THEN 1 ELSE 0 END AS is_owner,
            CASE
              WHEN a.user_id = ? THEN 0
              WHEN EXISTS (SELECT 1 FROM album_members am WHERE am.album_id = a.id AND am.user_id = ?) THEN 1
              WHEN EXISTS (SELECT 1 FROM album_class_access aca WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved') THEN 2
              ELSE 3
            END AS access_rank
          FROM albums a
          WHERE a.user_id = ?
             OR EXISTS (SELECT 1 FROM album_members am WHERE am.album_id = a.id AND am.user_id = ?)
             OR EXISTS (SELECT 1 FROM album_class_access aca WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved')
          ORDER BY a.created_at DESC`
      )
      .bind(userId, userId, userId, userId, userId, userId, userId, userId, userId)
      .all<Record<string, unknown>>()

    const rows = results ?? []
    const result = rows.map((a) => {
      const isOwner = Boolean(a.is_owner)
      const restMap = mapAlbumRow(a)
      return { ...restMap, isOwner }
    })

    return c.json(result)
  } catch (error) {
    console.error('ERROR ALBUMS API:', error)
    return c.json({ error: 'Internal server error', details: String(error) }, 500)
  }
})

albumsRoute.post('/', requireAuthJwt, async (c) => {
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const user = c.get('user')
    if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const {
      name,
      type,
      description,
      pricing_package_id,
      discount_voucher_code,
      school_city,
      kab_kota,
      wa_e164,
      province_id,
      province_name,
      pic_name,
      students_count,
      source,
      total_estimated_price,
    } = body

    if (!name || !type) return c.json({ error: 'Missing required fields' }, 400)

    // Add default behavior where new albums have individual payments disabled initially
    // unless specified (we update this to true upon creator's first checkout).
    const individual_payments_enabled = 1

    // Fetch pricing package to create snapshot
    let packageSnapshotJson = null
    if (pricing_package_id) {
      const pkgData = await db
        .prepare(
          'SELECT name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features FROM pricing_packages WHERE id = ?'
        )
        .bind(pricing_package_id)
        .first<PackageData>()

      if (pkgData) {
        packageSnapshotJson = JSON.stringify({
          name: pkgData.name,
          price_per_student: pkgData.price_per_student,
          min_students: pkgData.min_students,
          features: JSON.parse((pkgData.features as string) || '[]'),
          flipbook_enabled: Boolean(pkgData.flipbook_enabled),
          ai_labs_features: JSON.parse((pkgData.ai_labs_features as string) || '[]'),
        })
      }
    }

    const cleanVoucherCode =
      typeof discount_voucher_code === 'string'
        ? discount_voucher_code.toUpperCase().trim().replace(/\s+/g, '')
        : ''
    let appliedDiscountPercent: number | null = null

    const newId = crypto.randomUUID()

    // If voucher provided, validate and increment used_count atomically with album insert.
    if (cleanVoucherCode) {
      // D1 disallows BEGIN/COMMIT/ROLLBACK. Use a guarded UPDATE as the "claim" step.
      // This also enforces 1x per user by checking history in the UPDATE condition.
      const claimed = await db
        .prepare(
          `UPDATE discount_vouchers
           SET used_count = used_count + 1, updated_at = datetime('now')
           WHERE code = ?
             AND is_active = 1
             AND (expires_at IS NULL OR julianday(expires_at) >= julianday('now'))
             AND used_count < max_uses
             AND NOT EXISTS (
               SELECT 1 FROM discount_voucher_history h
               WHERE h.discount_voucher_id = discount_vouchers.id
                 AND h.user_id = ?
             )
           RETURNING id, percent_off, max_uses, used_count, expires_at`
        )
        .bind(cleanVoucherCode, user.id)
        .first<Record<string, unknown>>()

      if (!claimed) {
        // Provide a more specific message for UX.
        const row = await db
          .prepare(`SELECT id, percent_off, max_uses, used_count, is_active, expires_at FROM discount_vouchers WHERE code = ?`)
          .bind(cleanVoucherCode)
          .first<Record<string, unknown>>()

        if (!row) return c.json({ error: 'Voucher tidak valid.' }, 400)
        if (Number(row.is_active) !== 1) return c.json({ error: 'Voucher sudah tidak aktif.' }, 410)
        if (row.expires_at && new Date(String(row.expires_at)) < new Date()) return c.json({ error: 'Voucher sudah kadaluarsa.' }, 410)
        if (Number(row.used_count ?? 0) >= Number(row.max_uses ?? 1)) return c.json({ error: 'Voucher sudah mencapai batas pemakaian.' }, 410)

        const already = await db
          .prepare(`SELECT 1 FROM discount_voucher_history WHERE discount_voucher_id = ? AND user_id = ? LIMIT 1`)
          .bind(String(row.id ?? ''), user.id)
          .first()
        if (already) return c.json({ error: 'Kamu sudah pernah menggunakan voucher ini.' }, 409)

        return c.json({ error: 'Voucher sudah tidak tersedia.' }, 410)
      }

      const voucherId = String(claimed.id ?? '')
      const pct = Number(claimed.percent_off)
      if (!voucherId || !Number.isFinite(pct) || pct < 1 || pct > 100) {
        return c.json({ error: 'Voucher tidak valid.' }, 400)
      }
      appliedDiscountPercent = Math.round(pct)

      const result = await db
        .prepare(
          `INSERT INTO albums (
          id, user_id, name, type, description, pricing_package_id, package_snapshot,
          discount_voucher_code, discount_percent_off,
          school_city, kab_kota, wa_e164, province_id,
          province_name, pic_name, students_count, source,
          total_estimated_price, individual_payments_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
        )
        .bind(
          newId,
          user.id,
          name,
          type,
          description || null,
          pricing_package_id || null,
          packageSnapshotJson,
          cleanVoucherCode,
          appliedDiscountPercent,
          school_city || null,
          kab_kota || null,
          wa_e164 || null,
          province_id || null,
          province_name || null,
          pic_name || null,
          students_count || 0,
          source || null,
          total_estimated_price || 0,
          individual_payments_enabled
        )
        .first()

      const histId = crypto.randomUUID()
      await db
        .prepare(
          `INSERT INTO discount_voucher_history (id, discount_voucher_id, user_id, album_id, percent_off, used_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(histId, voucherId, user.id, newId, appliedDiscountPercent)
        .run()

      const notifId = crypto.randomUUID()
      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type, action_url) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(notifId, user.id, 'Menunggu Persetujuan', `Album "${name}" telah berhasil diajukan dan sedang menunggu persetujuan admin.`, 'info', '/user/riwayat')
        .run()
      invalidateUserResponseCaches(user.id)
      return c.json({ id: (result as any)?.id }, 201)
    }

    const result = await db
      .prepare(
        `INSERT INTO albums (
        id, user_id, name, type, description, pricing_package_id, package_snapshot,
        discount_voucher_code, discount_percent_off,
        school_city, kab_kota, wa_e164, province_id,
        province_name, pic_name, students_count, source,
        total_estimated_price, individual_payments_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .bind(
        newId,
        user.id,
        name,
        type,
        description || null,
        pricing_package_id || null,
        packageSnapshotJson,
        null,
        null,
        school_city || null,
        kab_kota || null,
        wa_e164 || null,
        province_id || null,
        province_name || null,
        pic_name || null,
        students_count || 0,
        source || null,
        total_estimated_price || 0,
        individual_payments_enabled
      )
      .first()

    const notifId = crypto.randomUUID()
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type, action_url) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(notifId, user.id, 'Menunggu Persetujuan', `Album "${name}" telah berhasil diajukan dan sedang menunggu persetujuan admin.`, 'info', '/user/riwayat')
      .run()
    invalidateUserResponseCaches(user.id)
    return c.json({ id: result?.id }, 201)
  } catch (error) {
    console.error('ERROR ALBUMS API:', error)
    return c.json({ error: 'Internal server error', details: String(error) }, 500)
  }
})

albumsRoute.delete('/:id', requireAuthJwt, async (c) => {
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const user = c.get('user')
    if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)

    const albumId = c.req.param('id')
    const isAdmin = user.role === 'admin'

    let stmt
    if (isAdmin) {
      stmt = db.prepare(`DELETE FROM albums WHERE id = ?`).bind(albumId)
    } else {
      stmt = db.prepare(`DELETE FROM albums WHERE id = ? AND user_id = ?`).bind(albumId, user.id)
    }

    const result = await stmt.run()
    if (!result.success) return c.json({ error: 'Failed to delete album or unauthorized' }, 400)

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('ERROR ALBUMS API:', error)
    return c.json({ error: 'Internal server error', details: String(error) }, 500)
  }
})

albumsRoute.put('/:id', requireAuthJwt, async (c) => {
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const user = c.get('user')
    if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)
    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const albumId = c.req.param('id')
    const body = await c.req.json()
    const { status } = body
    if (!status) return c.json({ error: 'Missing status' }, 400)
    // Ambil user_id dan nama untuk notif
    const albumInfo = await db.prepare('SELECT user_id, name FROM albums WHERE id = ?').bind(albumId).first()

    const result = await db
      .prepare('UPDATE albums SET status = ? WHERE id = ?')
      .bind(status, albumId)
      .run()
    if (!result.success) return c.json({ error: 'Failed to update album' }, 400)

    if (albumInfo && albumInfo.user_id) {
      const notifId = crypto.randomUUID()
      let notifTitle = ''
      let notifMessage = ''
      let notifType = 'info'

      if (status === 'approved' || status === 'accepted') {
        notifTitle = 'Persetujuan Disetujui'
        notifMessage = `Selamat! Pengajuan album "${albumInfo.name}" Anda telah disetujui.`
        notifType = 'success'
      } else if (status === 'declined' || status === 'rejected') {
        notifTitle = 'Persetujuan Ditolak'
        notifMessage = `Mohon maaf, pengajuan album "${albumInfo.name}" Anda ditolak oleh admin.`
        notifType = 'error'
      }

      if (notifTitle) {
        await db.prepare('INSERT INTO notifications (id, user_id, title, message, type, action_url) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(notifId, albumInfo.user_id, notifTitle, notifMessage, notifType, '/user/riwayat')
          .run()
        invalidateUserResponseCaches(albumInfo.user_id as string)
      }
    }

    return c.json({ success: true, status }, 200)
  } catch (error) {
    console.error('ERROR ALBUMS API (PUT):', error)
    return c.json({ error: 'Internal server error', details: String(error) }, 500)
  }
})

export default albumsRoute


