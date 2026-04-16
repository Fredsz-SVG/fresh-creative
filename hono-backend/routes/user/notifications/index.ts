import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { requireAuthJwt, getAuthUserId } from '../../../middleware'
import {
  getUserNotificationsCache,
  setUserNotificationsCache,
  invalidateUserResponseCaches,
} from '../../../lib/user-response-cache'

const userNotifications = new Hono()
userNotifications.use('*', requireAuthJwt)
const USER_NOTIFICATIONS_CACHE_TTL_MS = 2000

// GET - List all notifications
userNotifications.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const cached = getUserNotificationsCache(userId)
  if (cached) {
    c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
    c.header('X-Cache', 'HIT')
    return c.json(cached)
  }
  const { results } = await db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(userId)
    .all<Record<string, unknown>>()
  const payload = results ?? []
  setUserNotificationsCache(userId, payload, USER_NOTIFICATIONS_CACHE_TTL_MS)
  c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
  c.header('X-Cache', 'MISS')
  return c.json(payload)
})

// POST - Create notification
userNotifications.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json()
  const { title, message, type, action_url, metadata } = body || {}
  const id = crypto.randomUUID()
  const metaStr = metadata !== undefined && metadata !== null ? JSON.stringify(metadata) : null
  const ins = await db
    .prepare(
      `INSERT INTO notifications (id, user_id, title, message, type, action_url, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, userId, title, message, type || 'info', action_url ?? null, metaStr)
    .run()
  if (!ins.success) return c.json({ error: 'Insert failed' }, 500)
  invalidateUserResponseCaches(userId)
  const row = await db.prepare(`SELECT * FROM notifications WHERE id = ?`).bind(id).first()
  return c.json(row)
})

// PATCH - Mark all as read
userNotifications.patch('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  await db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).bind(userId).run()
  invalidateUserResponseCaches(userId)
  return c.json({ success: true })
})

// DELETE - Clear all
userNotifications.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  await db.prepare(`DELETE FROM notifications WHERE user_id = ?`).bind(userId).run()
  invalidateUserResponseCaches(userId)
  return c.json({ success: true })
})

export default userNotifications
