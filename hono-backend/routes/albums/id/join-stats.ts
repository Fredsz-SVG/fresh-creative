import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'
import { joinStatsCache, JOIN_STATS_TTL_MS } from '../../../lib/album-response-cache'

const albumsIdJoinStats = new Hono<AppEnv>()
albumsIdJoinStats.use('*', requireAuthJwt)

type JoinStatsPayload = {
  limit_count: number | null
  approved_count: number
  pending_count: number
  rejected_count: number
  available_slots: number
}

albumsIdJoinStats.get('/', async (c) => {
  const albumId = c.req.param('id')
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  try {
    const user = getAuthUserFromContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Cek cache
    const now = Date.now()
    const cached = joinStatsCache.get(albumId)
    if (cached && cached.expiresAt > now) {
      c.header('Cache-Control', 'private, max-age=30')
      c.header('X-Cache', 'HIT')
      return c.json(cached.value)
    }

    const album = await db
      .prepare(`SELECT id, user_id, students_count FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ id: string; user_id: string; students_count: number | null }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const approved = await db
      .prepare(
        `SELECT COUNT(*) as c FROM album_class_access WHERE album_id = ? AND status = 'approved'`
      )
      .bind(albumId)
      .first<{ c: number }>()
    const pending = await db
      .prepare(
        `SELECT COUNT(*) as c FROM album_join_requests WHERE album_id = ? AND status = 'pending'`
      )
      .bind(albumId)
      .first<{ c: number }>()
    const rejected = await db
      .prepare(
        `SELECT COUNT(*) as c FROM album_join_requests WHERE album_id = ? AND status = 'rejected'`
      )
      .bind(albumId)
      .first<{ c: number }>()

    const ownerHasApprovedAccess = await db
      .prepare(
        `SELECT 1 as ok FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved' LIMIT 1`
      )
      .bind(albumId, album.user_id)
      .first<{ ok: number }>()

    const approved_count = (approved?.c ?? 0) + (ownerHasApprovedAccess ? 0 : 1)
    const pending_count = pending?.c ?? 0
    const rejected_count = rejected?.c ?? 0
    const limit_count = album.students_count ?? null
    const available_slots =
      typeof limit_count === 'number' && limit_count > 0
        ? Math.max(0, limit_count - approved_count)
        : 999999

    const payload: JoinStatsPayload = { limit_count, approved_count, pending_count, rejected_count, available_slots }
    joinStatsCache.set(albumId, { value: payload, expiresAt: now + JOIN_STATS_TTL_MS })
    c.header('Cache-Control', 'private, max-age=30')
    c.header('X-Cache', 'MISS')
    return c.json(payload)
  } catch (error) {
    console.error('Error fetching join stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

export default albumsIdJoinStats






