import { Hono } from 'hono'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'
import { parseJsonArray } from '../../../lib/d1-json'
import { tryGetAuthUser } from '../../../lib/auth-user'
import type { AppEnv } from '../../../middleware'

const allClassMembersRoute = new Hono<AppEnv>()

// Cache 30 detik per-albumId — dipakai flipbook viewer & class list
type AllMembersCache = { value: Record<string, unknown>[]; expiresAt: number }
const allMembersCache = new Map<string, AllMembersCache>()
export function invalidateAllMembersCache(albumId: string) { allMembersCache.delete(albumId) }

allClassMembersRoute.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const user = await tryGetAuthUser(c)

    const album = await db
      .prepare(`SELECT user_id FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ user_id: string }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const roleRes = user ? await getRole(c, user) : 'user'
    const memberRow = user
      ? await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()
      : null

    const isGlobalAdmin = roleRes === 'admin'
    const isOwner = user ? album.user_id === user.id || isGlobalAdmin : false
    const isAlbumAdmin = memberRow?.role === 'admin'
    const canSeePending = user ? isOwner || isAlbumAdmin : false

    // Cek cache (hanya untuk public view / canSeePending=false untuk simplify)
    const cacheKey = albumId
    const now = Date.now()
    const cached = allMembersCache.get(cacheKey)
    if (cached && cached.expiresAt > now && !canSeePending) {
      c.header('Cache-Control', 'private, max-age=30')
      c.header('X-Cache', 'HIT')
      return c.json(cached.value)
    }

    const { results: data } = await db
      .prepare(
        `SELECT class_id, user_id, student_name, email, date_of_birth, instagram, tiktok, phone, message, video_url, photos, status
         FROM album_class_access WHERE album_id = ? AND status IN ('approved', 'pending') ORDER BY student_name ASC`
      )
      .bind(albumId)
      .all<Record<string, unknown>>()

    const allMembers = data ?? []

    const result = allMembers
      .filter((r) => canSeePending || r.status === 'approved')
      .map((r) => ({
        class_id: r.class_id,
        user_id: r.user_id,
        student_name: r.student_name,
        email: r.email,
        date_of_birth: r.date_of_birth,
        instagram: r.instagram,
        tiktok: r.tiktok,
        phone: r.phone,
        message: r.message,
        video_url: r.video_url,
        photos: parseJsonArray(r.photos as string) || [],
        status: r.status,
        is_me: user ? r.user_id === user.id : false,
      }))

    if (!canSeePending) {
      allMembersCache.set(cacheKey, { value: result, expiresAt: now + 30_000 })
    }
    c.header('Cache-Control', 'private, max-age=30')
    c.header('X-Cache', 'MISS')
    return c.json(result)
  } catch (err: unknown) {
    console.error('Error fetching all class members:', err)
    return c.json({ error: err instanceof Error ? err.message : 'Error' }, 500)
  }
})

export default allClassMembersRoute





