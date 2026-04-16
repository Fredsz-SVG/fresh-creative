import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const albumJoinRequestsRoute = new Hono()

albumJoinRequestsRoute.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const status = c.req.query('status')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    if (status === 'approved') {
      const { results: approvedData } = await db
        .prepare(
          `SELECT id, user_id, student_name, email, class_id, status, has_paid, payment_status, created_at FROM album_class_access
           WHERE album_id = ? AND status = 'approved' ORDER BY created_at DESC`
        )
        .bind(albumId)
        .all<Record<string, unknown>>()

      const transformed = (approvedData ?? []).map((access) => ({
        id: access.id,
        album_id: albumId,
        user_id: access.user_id,
        student_name: access.student_name,
        email: access.email,
        phone: null,
        class_name: null,
        assigned_class_id: access.class_id,
        status: 'approved',
        has_paid: access.has_paid,
        payment_status: access.payment_status,
        requested_at: access.created_at,
        approved_at: access.created_at,
        approved_by: null,
      }))
      return c.json(transformed)
    }
    let sql = `SELECT id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at
      FROM album_join_requests WHERE album_id = ?`
    const binds: string[] = [albumId]
    if (status && status !== 'all') {
      sql += ` AND status = ?`
      binds.push(status)
    }
    sql += ` ORDER BY requested_at DESC`
    const { results: data } = await db
      .prepare(sql)
      .bind(...binds)
      .all<Record<string, unknown>>()
    return c.json(data ?? [])
  } catch {
    return c.json({ error: 'Failed to fetch join requests' })
  }
})

albumJoinRequestsRoute.post('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const body = await c.req.json()
    const { student_name, class_name, email, phone } = body
    if (!student_name || !email) {
      return c.json({ error: 'Nama dan email wajib diisi' }, 400)
    }
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized - silakan login terlebih dahulu' }, 401)
    }

    const album = await db
      .prepare(`SELECT id, students_count, name, user_id FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ id: string; students_count: number | null; name: string; user_id: string }>()
    if (!album) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }

    if (album.students_count != null && album.students_count > 0) {
      const cnt = await db
        .prepare(
          `SELECT COUNT(*) as c FROM album_class_access WHERE album_id = ? AND status = 'approved'`
        )
        .bind(albumId)
        .first<{ c: number }>()
      // Owner album dihitung sebagai 1 slot terisi (walau owner tidak punya row album_class_access).
      const approvedCount = (cnt?.c ?? 0) + 1
      if (approvedCount >= album.students_count) {
        return c.json(
          { error: 'Maaf, album sudah penuh. Tidak bisa menerima pendaftaran lagi.' },
          400
        )
      }
    }

    const existing = await db
      .prepare(
        `SELECT id, status, email FROM album_join_requests WHERE album_id = ? AND user_id = ?`
      )
      .bind(albumId, user.id)
      .first<{ id: string; status: string; email: string }>()

    const insertNotif = async () => {
      const nid = crypto.randomUUID()
      await db
        .prepare(
          `INSERT INTO notifications (id, user_id, title, message, type, metadata, created_at)
           VALUES (?, ?, ?, ?, 'info', ?, datetime('now'))`
        )
        .bind(
          nid,
          user.id,
          'Status Pendaftaran Album',
          `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
          JSON.stringify({ status: 'Menunggu Persetujuan' })
        )
        .run()
    }

    if (existing) {
      if (existing.status === 'pending') {
        return c.json({ error: 'Anda sudah mendaftar dan menunggu persetujuan' }, 400)
      }
      if (existing.status === 'approved') {
        return c.json({ error: 'Anda sudah terdaftar dan disetujui' }, 400)
      }
      if (existing.status === 'rejected') {
        const upd = await db
          .prepare(
            `UPDATE album_join_requests SET student_name = ?, class_name = ?, email = ?, phone = ?, status = 'pending', requested_at = datetime('now')
             WHERE id = ?`
          )
          .bind(student_name, class_name || null, email, phone || null, existing.id)
          .run()
        if (!upd.success) {
          return c.json({ error: 'Gagal mendaftar ulang' }, 500)
        }
        await insertNotif()
        const updated_data = await db
          .prepare(`SELECT * FROM album_join_requests WHERE id = ?`)
          .bind(existing.id)
          .first()
        return c.json(
          {
            success: true,
            message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
            data: updated_data,
          },
          201
        )
      }
    }

    const rid = crypto.randomUUID()
    const ins = await db
      .prepare(
        `INSERT INTO album_join_requests (id, album_id, user_id, student_name, class_name, email, phone, status, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
      )
      .bind(rid, albumId, user.id, student_name, class_name || null, email, phone || null)
      .run()
    if (!ins.success) {
      return c.json({ error: 'Gagal mendaftar' })
    }
    await insertNotif()
    const request_data = await db
      .prepare(`SELECT * FROM album_join_requests WHERE id = ?`)
      .bind(rid)
      .first()
    return c.json(
      {
        success: true,
        message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
        data: request_data,
      },
      201
    )
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Terjadi kesalahan' })
  }
})

export default albumJoinRequestsRoute
