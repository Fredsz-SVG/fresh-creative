import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'

const albumFlipbookRoute = new Hono()

// GET /api/albums/:id/flipbook/public — no auth, for public showcase
albumFlipbookRoute.get('/public', async (c) => {
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  try {
    const album = await db
      .prepare(`SELECT id, name FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ id: string; name: string }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const { results: pageRows } = await db
      .prepare(`SELECT * FROM manual_flipbook_pages WHERE album_id = ? ORDER BY page_number ASC`)
      .bind(albumId)
      .all<Record<string, unknown>>()
    const pages = pageRows ?? []
    const pageIds = pages.map((p) => p.id as string).filter(Boolean)
    let hotspotsByPage = new Map<string, Record<string, unknown>[]>()
    if (pageIds.length > 0) {
      const ph = pageIds.map(() => '?').join(',')
      const { results: hs } = await db
        .prepare(`SELECT * FROM flipbook_video_hotspots WHERE page_id IN (${ph})`)
        .bind(...pageIds)
        .all<Record<string, unknown>>()
      for (const h of hs ?? []) {
        const pid = h.page_id as string
        const arr = hotspotsByPage.get(pid) ?? []
        arr.push(h)
        hotspotsByPage.set(pid, arr)
      }
    }
    const out = pages.map((p) => ({
      ...p,
      flipbook_video_hotspots: hotspotsByPage.get(p.id as string) ?? [],
    }))
    return c.json({ pages: out, albumName: album.name || 'Preview Flipbook' })
  } catch {
    return c.json({ error: 'Failed to load flipbook' }, 500)
  }
})

// POST /api/albums/:id/flipbook — clean flipbook assets (admin/owner only)
albumFlipbookRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (!isOwner) {
    const member = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    if (!member || member.role !== 'admin') {
      return c.json({ error: 'Only administrators can clean flipbook' }, 403)
    }
  }
  try {
    const { results: pageIds } = await db
      .prepare(`SELECT id FROM manual_flipbook_pages WHERE album_id = ?`)
      .bind(albumId)
      .all<{ id: string }>()
    const ids = (pageIds ?? []).map((p) => p.id)
    if (ids.length > 0) {
      const ph = ids.map(() => '?').join(',')
      await db
        .prepare(`DELETE FROM flipbook_video_hotspots WHERE page_id IN (${ph})`)
        .bind(...ids)
        .run()
    }
    await db.prepare(`DELETE FROM manual_flipbook_pages WHERE album_id = ?`).bind(albumId).run()
    return c.json({
      message: 'Flipbook assets cleaned successfully (DB only, storage cleanup not implemented in Workers)',
    })
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// GET /api/albums/:id/flipbook — get flipbook pages
albumFlipbookRoute.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const albumId = c.req.param('id')
  const { results: pageRows } = await db
    .prepare(`SELECT * FROM manual_flipbook_pages WHERE album_id = ? ORDER BY page_number ASC`)
    .bind(albumId)
    .all<Record<string, unknown>>()
  const pages = pageRows ?? []
  const pageIds = pages.map((p) => p.id as string).filter(Boolean)
  let hotspotsByPage = new Map<string, Record<string, unknown>[]>()
  if (pageIds.length > 0) {
    const ph = pageIds.map(() => '?').join(',')
    const { results: hs } = await db
      .prepare(`SELECT * FROM flipbook_video_hotspots WHERE page_id IN (${ph})`)
      .bind(...pageIds)
      .all<Record<string, unknown>>()
    for (const h of hs ?? []) {
      const pid = h.page_id as string
      const arr = hotspotsByPage.get(pid) ?? []
      arr.push(h)
      hotspotsByPage.set(pid, arr)
    }
  }
  const out = pages.map((p) => ({
    ...p,
    flipbook_video_hotspots: hotspotsByPage.get(p.id as string) ?? [],
  }))
  return c.json(out)
})

export default albumFlipbookRoute
