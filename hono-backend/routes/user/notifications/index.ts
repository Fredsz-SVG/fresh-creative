import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const userNotifications = new Hono()

// GET - List all notifications
userNotifications.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { results } = await db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(user.id)
    .all<Record<string, unknown>>()
  return c.json(results ?? [])
})

// POST - Create notification
userNotifications.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json()
  const { title, message, type, action_url, metadata } = body || {}
  const id = crypto.randomUUID()
  const metaStr =
    metadata !== undefined && metadata !== null ? JSON.stringify(metadata) : null
  const ins = await db
    .prepare(
      `INSERT INTO notifications (id, user_id, title, message, type, action_url, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, user.id, title, message, type || 'info', action_url ?? null, metaStr)
    .run()
  if (!ins.success) return c.json({ error: 'Insert failed' }, 500)
  const row = await db.prepare(`SELECT * FROM notifications WHERE id = ?`).bind(id).first()
  return c.json(row)
})

// PATCH - Mark all as read
userNotifications.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`)
    .bind(user.id)
    .run()
  return c.json({ success: true })
})

// DELETE - Clear all
userNotifications.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  await db.prepare(`DELETE FROM notifications WHERE user_id = ?`).bind(user.id).run()
  return c.json({ success: true })
})

export default userNotifications
