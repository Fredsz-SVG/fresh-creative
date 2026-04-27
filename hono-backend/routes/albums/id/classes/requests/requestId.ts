import { Hono } from 'hono'
import { getRole } from '../../../../../lib/auth'
import { getD1 } from '../../../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../../../middleware'
import { getAuthUserFromContext } from '../../../../../lib/auth-user'

const classRequestIdRoute = new Hono<AppEnv>()
classRequestIdRoute.use('*', requireAuthJwt)

classRequestIdRoute.patch('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  const requestId = c.req.param('requestId')
  if (!albumId || !classId || !requestId) return c.json({ error: 'IDs required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = album.user_id === user.id
  const globalRole = await getRole(c, user)
  if (!isOwner && globalRole !== 'admin') {
    const member = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    if (member?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const status =
    body?.status === 'approved' ? 'approved' : body?.status === 'rejected' ? 'rejected' : null
  if (!status) return c.json({ error: 'status must be approved or rejected' }, 400)

  const row = await db
    .prepare(
      `SELECT id, assigned_class_id, user_id, student_name, email, album_id FROM album_join_requests
       WHERE id = ? AND assigned_class_id = ?`
    )
    .bind(requestId, classId)
    .first<{
      id: string
      assigned_class_id: string
      user_id: string | null
      student_name: string
      email: string | null
      album_id: string
    }>()

  if (!row) return c.json({ error: 'Request not found' }, 404)

  if (status === 'approved') {
    if (!row.user_id) return c.json({ error: 'Request has no user' }, 400)
    const accessId = crypto.randomUUID()
    const ins = await db
      .prepare(
        `INSERT INTO album_class_access (id, album_id, class_id, user_id, student_name, email, status, photos, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'approved', '[]', datetime('now'), datetime('now'))`
      )
      .bind(
        accessId,
        row.album_id,
        row.assigned_class_id,
        row.user_id,
        row.student_name,
        row.email ?? null
      )
      .run()
    if (!ins.success) return c.json({ error: 'Insert failed' }, 500)

    await db
      .prepare(
        `INSERT INTO album_members (album_id, user_id, role, joined_at) VALUES (?, ?, 'member', datetime('now'))
         ON CONFLICT(album_id, user_id) DO UPDATE SET role = excluded.role`
      )
      .bind(row.album_id, row.user_id)
      .run()

    await db.prepare(`DELETE FROM album_join_requests WHERE id = ?`).bind(requestId).run()

    const created = await db
      .prepare(`SELECT * FROM album_class_access WHERE id = ?`)
      .bind(accessId)
      .first()
    return c.json(created)
  }

  const upd = await db
    .prepare(`UPDATE album_join_requests SET status = 'rejected' WHERE id = ?`)
    .bind(requestId)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  const updated = await db
    .prepare(`SELECT * FROM album_join_requests WHERE id = ?`)
    .bind(requestId)
    .first()
  return c.json(updated)
})

export default classRequestIdRoute
