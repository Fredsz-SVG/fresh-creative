import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { requireAuthJwt, getAuthUserId } from '../../../middleware'
import { invalidateUserResponseCaches } from '../../../lib/user-response-cache'

const userNotificationsId = new Hono()
userNotificationsId.use('*', requireAuthJwt)

// PATCH / — Mark single notification as read
// Route sudah di-mount di /api/user/notifications/:id, jadi handler-nya '/'
userNotificationsId.patch('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const r = await db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  invalidateUserResponseCaches(userId)
  const row = await db
    .prepare(`SELECT * FROM notifications WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first()
  return c.json(row)
})

// DELETE / — Hapus satu notifikasi
userNotificationsId.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const r = await db
    .prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .run()
  if (!r.success) return c.json({ error: 'Delete failed' }, 500)
  invalidateUserResponseCaches(userId)
  return c.json({ success: true })
})

export default userNotificationsId
