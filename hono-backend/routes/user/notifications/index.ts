import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { requireAuthJwt, getAuthUserId } from '../../../middleware'
import {
  getUserNotificationsCache,
  setUserNotificationsCache,
  invalidateUserResponseCaches,
} from '../../../lib/user-response-cache'
import { createNotification } from '../../../lib/notifications'

const userNotifications = new Hono()
userNotifications.use('*', requireAuthJwt)
// 30 detik: notifikasi baru datang via realtime event, bukan polling
const USER_NOTIFICATIONS_CACHE_TTL_MS = 30_000

// GET - List all notifications
userNotifications.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const cached = getUserNotificationsCache(userId)
  if (cached) {
    c.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    c.header('X-Cache', 'HIT')
    return c.json(cached)
  }
  const { results } = await db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(userId)
    .all<Record<string, unknown>>()
  const payload = results ?? []
  setUserNotificationsCache(userId, payload, USER_NOTIFICATIONS_CACHE_TTL_MS)
  c.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
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

  const row = await createNotification(db, c.env, {
    userId,
    title,
    message,
    type,
    actionUrl: action_url,
    metadata
  })

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






