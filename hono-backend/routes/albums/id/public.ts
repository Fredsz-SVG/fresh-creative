import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import {
  albumPublicCache,
  ALBUM_PUBLIC_TTL_MS,
  type AlbumPublicPayload,
} from '../../../lib/album-response-cache'

const albumsIdPublic = new Hono()

albumsIdPublic.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const db = getD1(c)
    if (!db) {
      return c.json({ error: 'Database not configured' }, 503)
    }

    // ── 1. Cek cache ──
    const now = Date.now()
    const cached = albumPublicCache.get(albumId)
    if (cached && cached.expiresAt > now) {
      const clientEtag = c.req.header('If-None-Match')
      if (clientEtag && clientEtag === cached.etag) {
        return new Response(null, { status: 304 })
      }
      c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=30')
      c.header('ETag', cached.etag)
      c.header('X-Cache', 'HIT')
      return c.json(cached.value)
    }

    // ── 2. Query D1 ──
    const album = await db
      .prepare(`SELECT id, name, description, students_count FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{
        id: string
        name: string
        description: string | null
        students_count: number | null
      }>()
    if (!album) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }
    const { results: classes } = await db
      .prepare(
        `SELECT id, name, sort_order FROM album_classes WHERE album_id = ? ORDER BY sort_order ASC`
      )
      .bind(albumId)
      .all<{ id: string; name: string; sort_order: number }>()

    const payload: AlbumPublicPayload = { ...album, classes: classes ?? [] }
    const etag = `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}"`
    albumPublicCache.set(albumId, { value: payload, expiresAt: now + ALBUM_PUBLIC_TTL_MS, etag })

    c.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=30')
    c.header('ETag', etag)
    c.header('X-Cache', 'MISS')
    return c.json(payload, 200)
  } catch {
    return c.json({ error: 'Failed to fetch album' }, 500)
  }
})

export default albumsIdPublic







