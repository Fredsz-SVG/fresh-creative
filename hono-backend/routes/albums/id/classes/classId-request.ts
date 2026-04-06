import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getD1 } from '../../../../lib/edge-env'
import { publishRealtimeEventFromContext } from '../../../../lib/realtime'

const classRequestRoute = new Hono()

classRequestRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = album.user_id === user.id
  if (!isOwner) {
    const member = await db
      .prepare(`SELECT album_id FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ album_id: string }>()
    if (!member) return c.json({ error: 'Anda harus bergabung ke album dulu via link undangan' }, 403)
  }

  const cls = await db
    .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string; album_id: string }>()
  if (!cls) return c.json({ error: 'Kelas tidak ditemukan' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : user.email ?? ''

  if (!student_name) return c.json({ error: 'Nama siswa wajib' }, 400)

  const existingAccess = await db
    .prepare(`SELECT id, status FROM album_class_access WHERE class_id = ? AND user_id = ?`)
    .bind(classId, user.id)
    .first<{ id: string; status: string }>()

  const existingRequest = await db
    .prepare(
      `SELECT id, status FROM album_join_requests WHERE assigned_class_id = ? AND user_id = ? AND album_id = ?`
    )
    .bind(classId, user.id, albumId)
    .first<{ id: string; status: string }>()

  if (existingAccess) {
    if (existingAccess.status === 'approved') {
      const fullAccess = await db
        .prepare(`SELECT * FROM album_class_access WHERE id = ?`)
        .bind(existingAccess.id)
        .first()
      return c.json(fullAccess ?? existingAccess, 200)
    }
    if (existingAccess.status === 'rejected') {
      await db.prepare(`DELETE FROM album_class_access WHERE id = ?`).bind(existingAccess.id).run()
    }
  }

  if (existingRequest?.status === 'pending') {
    const fullRequest = await db
      .prepare(`SELECT * FROM album_join_requests WHERE id = ?`)
      .bind(existingRequest.id)
      .first()
    return c.json(fullRequest ?? existingRequest)
  }

  if (existingRequest?.status === 'rejected') {
    const upd = await db
      .prepare(
        `UPDATE album_join_requests SET student_name = ?, email = ?, status = 'pending' WHERE id = ?`
      )
      .bind(student_name, email || null, existingRequest.id)
      .run()
    if (!upd.success) return c.json({ error: 'Update failed' }, 500)
    const updated = await db
      .prepare(`SELECT * FROM album_join_requests WHERE id = ?`)
      .bind(existingRequest.id)
      .first()
    return c.json(updated, 200)
  }

  const rid = crypto.randomUUID()
  try {
    await db
      .prepare(
        `INSERT INTO album_join_requests (id, album_id, assigned_class_id, user_id, student_name, email, status, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
      )
      .bind(rid, albumId, classId, user.id, student_name, email || null)
      .run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ error: msg }, 500)
  }

  // Kirim notifikasi "Menunggu" ke user yang mendaftar
  try {
    const albumData = await db
      .prepare(`SELECT name FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ name: string }>()
    const clsData = await db
      .prepare(`SELECT name FROM album_classes WHERE id = ?`)
      .bind(classId)
      .first<{ name: string }>()
    const notifId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, title, message, type, metadata, created_at)
         VALUES (?, ?, ?, ?, 'info', ?, datetime('now'))`
      )
      .bind(
        notifId,
        user.id,
        'Status Pendaftaran Album',
        `${albumData?.name || 'Album'}\n${student_name}${clsData?.name ? ` - ${clsData.name}` : ''}\n${email || ''}`,
        JSON.stringify({ status: 'Menunggu' })
      )
      .run()
  } catch { /* non-fatal */ }

  const created = await db.prepare(`SELECT * FROM album_join_requests WHERE id = ?`).bind(rid).first()

  // Broadcast ke semua device agar approval sidebar langsung update
  void publishRealtimeEventFromContext(c, {
    type: 'api.mutated',
    channel: 'global',
    payload: { path: `/api/albums/${albumId}/join-requests`, action: 'create' },
    ts: new Date().toISOString(),
  })

  return c.json(created)
})

export default classRequestRoute
