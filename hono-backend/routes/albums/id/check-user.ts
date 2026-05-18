import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'

const checkUserRoute = new Hono<AppEnv>()
checkUserRoute.use('*', requireAuthJwt)

// Cache 30 detik per-user+albumId
type CheckUserPayload = Record<string, unknown>
type CacheEntry = { value: CheckUserPayload; expiresAt: number }
const checkUserCache = new Map<string, CacheEntry>()
const CHECK_USER_TTL_MS = 30_000

export function invalidateCheckUserCache(albumId: string, userId?: string): void {
  if (userId) {
    checkUserCache.delete(`${albumId}:${userId}`)
  } else {
    // Invalidate semua entry untuk albumId ini
    for (const key of checkUserCache.keys()) {
      if (key.startsWith(`${albumId}:`)) checkUserCache.delete(key)
    }
  }
}

checkUserRoute.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const user = getAuthUserFromContext(c)
    if (!user) {
      return c.json({ hasRequest: false }, 200)
    }

    // Cek cache
    const cacheKey = `${albumId}:${user.id}`
    const now = Date.now()
    const cached = checkUserCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      c.header('Cache-Control', 'private, max-age=30')
      c.header('X-Cache', 'HIT')
      return c.json(cached.value)
    }

    const memberAccess = await db
      .prepare(`SELECT 1 FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first()

    let payload: CheckUserPayload
    if (memberAccess) {
      payload = { hasRequest: true, status: 'approved', has_paid: 1, payment_status: 'paid' }
    } else {
      const classAccess = await db
        .prepare(
          `SELECT id, status, has_paid, payment_status FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
        )
        .bind(albumId, user.id)
        .first<{ id: string; status: string; has_paid?: number; payment_status?: string }>()

      if (classAccess) {
        payload = {
          hasRequest: true,
          status: 'approved',
          has_paid: classAccess.has_paid ?? 1,
          payment_status: classAccess.payment_status ?? 'paid',
          access_id: classAccess.id,
        }
      } else {
        const existing = await db
          .prepare(`SELECT id, status FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ id: string; status: string }>()
        payload = existing
          ? { hasRequest: true, status: existing.status }
          : { hasRequest: false }
      }
    }

    checkUserCache.set(cacheKey, { value: payload, expiresAt: now + CHECK_USER_TTL_MS })
    c.header('Cache-Control', 'private, max-age=30')
    c.header('X-Cache', 'MISS')
    return c.json(payload)
  } catch (error: unknown) {
    console.error('Error checking user request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default checkUserRoute






