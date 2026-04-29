import { Hono } from 'hono'
import type { Context } from 'hono'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'
import { getAssets } from '../../../lib/edge-env'
import { putAlbumPhoto } from '../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../lib/public-file-url'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'

const albumFlipbookRoute = new Hono<AppEnv>()
albumFlipbookRoute.use('*', async (c, next) => {
  // Keep public flipbook endpoint accessible without auth.
  if (c.req.path.endsWith('/flipbook/public')) {
    await next()
    return
  }
  return requireAuthJwt(c, next)
})

type FlipbookManageDenied = {
  ok: false
  status: 401 | 403 | 404 | 503
  error: string
}

type FlipbookManageAllowed = {
  ok: true
  db: D1Database
  userId: string
}

type FlipbookManageResult = FlipbookManageDenied | FlipbookManageAllowed

async function canManageFlipbook(c: Context, albumId: string): Promise<FlipbookManageResult> {
  const db = getD1(c)
  if (!db) return { ok: false, status: 503, error: 'Database not configured' }
  const user = getAuthUserFromContext(c as unknown as import('hono').Context<AppEnv>)
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }
  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return { ok: false, status: 404, error: 'Album not found' }
  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (isOwner) return { ok: true, db, userId: user.id }
  const member = await db
    .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, user.id)
    .first<{ role: string }>()
  if (member?.role === 'admin') return { ok: true, db, userId: user.id }
  return { ok: false, status: 403, error: 'Only administrators can manage flipbook' }
}

function denyFlipbookManage(c: Context, perm: FlipbookManageDenied) {
  return c.json({ error: perm.error }, { status: perm.status })
}

// POST /api/albums/:id/flipbook/upload — upload flipbook file to R2 (owner/admin/album-admin)
albumFlipbookRoute.post('/upload', async (c) => {
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)

  const user = getAuthUserFromContext(c)
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
  let isAlbumAdmin = false
  if (!isOwner) {
    const member = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    isAlbumAdmin = member?.role === 'admin'
  }
  if (!isOwner && !isAlbumAdmin) {
    return c.json({ error: 'Only administrators can upload flipbook assets' }, 403)
  }

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'application/octet-stream'
  let target = 'pages'

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file != null && typeof file !== 'string') {
      fileData = await (file as Blob).arrayBuffer()
      filename = (file as File).name || 'file.bin'
      mimetype = (file as File).type || 'application/octet-stream'
    }
    const t = formData.get('target')
    if (typeof t === 'string' && t.trim()) target = t.trim().toLowerCase()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0) return c.json({ error: 'file required' }, 400)
  if (!['pages', 'hotspots'].includes(target)) return c.json({ error: 'Invalid target' }, 400)

  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const safeImageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const safeVideoExt = ['mp4', 'webm', 'mov', 'm4v']
  const safeExt = [...safeImageExt, ...safeVideoExt].includes(ext) ? ext : 'bin'
  const relPath = `${albumId}/flipbook/${target}/${crypto.randomUUID()}.${safeExt}`

  try {
    await putAlbumPhoto(bucket, relPath, fileData, {
      contentType: mimetype,
      // Key selalu random UUID, aman di-cache lama untuk percepat repeat preview.
      cacheControl: 'public, max-age=31536000, immutable',
    })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Upload gagal' }, 500)
  }

  return c.json({ file_url: publicAlbumAssetUrl(c, relPath), rel_path: relPath })
})

// POST /api/albums/:id/flipbook/pages — insert page
albumFlipbookRoute.post('/pages', async (c) => {
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const body = await c.req.json<Record<string, unknown>>()
  const pageNumber = Number(body.page_number ?? 0)
  const imageUrl = String(body.image_url ?? '')
  const width = body.width == null ? null : Number(body.width)
  const height = body.height == null ? null : Number(body.height)
  if (!pageNumber || !imageUrl) return c.json({ error: 'page_number and image_url required' }, 400)
  const id = crypto.randomUUID()
  const ins = await perm.db
    .prepare(
      `INSERT INTO manual_flipbook_pages (id, album_id, page_number, image_url, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, albumId, pageNumber, imageUrl, width, height)
    .run()
  if (!ins.success) return c.json({ error: 'Insert failed' }, 500)
  const row = await perm.db
    .prepare(`SELECT * FROM manual_flipbook_pages WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(row)
})

// PATCH /api/albums/:id/flipbook/pages/:pageId — update page
albumFlipbookRoute.patch('/pages/:pageId', async (c) => {
  const albumId = c.req.param('id')
  const pageId = c.req.param('pageId')
  if (!albumId || !pageId) return c.json({ error: 'Album ID and page ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const body = await c.req.json<Record<string, unknown>>()
  const sets: string[] = []
  const vals: unknown[] = []
  if (body.image_url !== undefined) {
    sets.push('image_url = ?')
    vals.push(String(body.image_url ?? ''))
  }
  if (body.page_number !== undefined) {
    sets.push('page_number = ?')
    vals.push(Number(body.page_number ?? 0))
  }
  if (body.width !== undefined) {
    sets.push('width = ?')
    vals.push(body.width == null ? null : Number(body.width))
  }
  if (body.height !== undefined) {
    sets.push('height = ?')
    vals.push(body.height == null ? null : Number(body.height))
  }
  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400)
  vals.push(pageId, albumId)
  const upd = await perm.db
    .prepare(`UPDATE manual_flipbook_pages SET ${sets.join(', ')} WHERE id = ? AND album_id = ?`)
    .bind(...vals)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  const row = await perm.db
    .prepare(`SELECT * FROM manual_flipbook_pages WHERE id = ? AND album_id = ?`)
    .bind(pageId, albumId)
    .first<Record<string, unknown>>()
  return c.json(row)
})

// POST /api/albums/:id/flipbook/pages/reorder — set page order by ids
albumFlipbookRoute.post('/pages/reorder', async (c) => {
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const body = await c.req.json<Record<string, unknown>>()
  const pageIds = Array.isArray(body.page_ids)
    ? (body.page_ids as unknown[]).map((v) => String(v))
    : []
  if (!pageIds.length) return c.json({ error: 'page_ids required' }, 400)
  for (let i = 0; i < pageIds.length; i++) {
    await perm.db
      .prepare(`UPDATE manual_flipbook_pages SET page_number = ? WHERE id = ? AND album_id = ?`)
      .bind(i + 1, pageIds[i], albumId)
      .run()
  }
  return c.json({ ok: true })
})

// POST /api/albums/:id/flipbook/hotspots — insert hotspot
albumFlipbookRoute.post('/hotspots', async (c) => {
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const body = await c.req.json<Record<string, unknown>>()
  const pageId = String(body.page_id ?? '')
  if (!pageId) return c.json({ error: 'page_id required' }, 400)
  const id = crypto.randomUUID()
  const videoUrl = String(body.video_url ?? '')
  const label = String(body.label ?? '')
  const x = Number(body.x ?? 0)
  const y = Number(body.y ?? 0)
  const width = Number(body.width ?? 0)
  const height = Number(body.height ?? 0)
  const ins = await perm.db
    .prepare(
      `INSERT INTO flipbook_video_hotspots (id, page_id, video_url, label, x, y, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, pageId, videoUrl, label, x, y, width, height)
    .run()
  if (!ins.success) return c.json({ error: 'Insert failed' }, 500)
  const row = await perm.db
    .prepare(`SELECT * FROM flipbook_video_hotspots WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(row)
})

// PATCH /api/albums/:id/flipbook/hotspots/:hotspotId — update hotspot
albumFlipbookRoute.patch('/hotspots/:hotspotId', async (c) => {
  const albumId = c.req.param('id')
  const hotspotId = c.req.param('hotspotId')
  if (!albumId || !hotspotId) return c.json({ error: 'Album ID and hotspot ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const body = await c.req.json<Record<string, unknown>>()
  const sets: string[] = []
  const vals: unknown[] = []
  if (body.video_url !== undefined) {
    sets.push('video_url = ?')
    vals.push(String(body.video_url ?? ''))
  }
  if (body.label !== undefined) {
    sets.push('label = ?')
    vals.push(String(body.label ?? ''))
  }
  if (body.x !== undefined) {
    sets.push('x = ?')
    vals.push(Number(body.x ?? 0))
  }
  if (body.y !== undefined) {
    sets.push('y = ?')
    vals.push(Number(body.y ?? 0))
  }
  if (body.width !== undefined) {
    sets.push('width = ?')
    vals.push(Number(body.width ?? 0))
  }
  if (body.height !== undefined) {
    sets.push('height = ?')
    vals.push(Number(body.height ?? 0))
  }
  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400)
  vals.push(hotspotId)
  const upd = await perm.db
    .prepare(`UPDATE flipbook_video_hotspots SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  const row = await perm.db
    .prepare(`SELECT * FROM flipbook_video_hotspots WHERE id = ?`)
    .bind(hotspotId)
    .first<Record<string, unknown>>()
  return c.json(row)
})

// DELETE /api/albums/:id/flipbook/hotspots/:hotspotId — delete hotspot
albumFlipbookRoute.delete('/hotspots/:hotspotId', async (c) => {
  const albumId = c.req.param('id')
  const hotspotId = c.req.param('hotspotId')
  if (!albumId || !hotspotId) return c.json({ error: 'Album ID and hotspot ID required' }, 400)
  const perm = await canManageFlipbook(c, albumId)
  if (!perm.ok) return denyFlipbookManage(c, perm as FlipbookManageDenied)
  const del = await perm.db
    .prepare(`DELETE FROM flipbook_video_hotspots WHERE id = ?`)
    .bind(hotspotId)
    .run()
  if (!del.success) return c.json({ error: 'Delete failed' }, 500)
  return c.json({ ok: true })
})

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
    const hotspotsByPage = new Map<string, Record<string, unknown>[]>()
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
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
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
      message:
        'Flipbook assets cleaned successfully (DB only, storage cleanup not implemented in Workers)',
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
  const hotspotsByPage = new Map<string, Record<string, unknown>[]>()
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
