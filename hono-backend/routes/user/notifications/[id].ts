import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const userNotificationsId = new Hono()

// PATCH - Mark single notification as read
userNotificationsId.patch('/:id', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { id } = c.req.param()
  const r = await db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  const row = await db
    .prepare(`SELECT * FROM notifications WHERE id = ? AND user_id = ?`)
    .bind(id, user.id)
    .first()
  return c.json(row)
})

export default userNotificationsId
