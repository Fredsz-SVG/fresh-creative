import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { requireAuthJwt, getAuthUserId } from '../../../middleware'
import { invalidateUserResponseCaches } from '../../../lib/user-response-cache'

const userNotificationsId = new Hono()
userNotificationsId.use('*', requireAuthJwt)

// PATCH - Mark single notification as read
userNotificationsId.patch('/:id', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const { id } = c.req.param()
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

export default userNotificationsId
