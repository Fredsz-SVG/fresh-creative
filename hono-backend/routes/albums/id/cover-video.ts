import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1, getAssets } from '../../../lib/edge-env'
import { putAlbumPhoto } from '../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../lib/public-file-url'

const albumCoverVideoRoute = new Hono()

// POST /api/albums/:id/cover-video
albumCoverVideoRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'video/mp4'

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file != null && typeof file !== 'string') {
      fileData = await (file as Blob).arrayBuffer()
      filename = (file as File).name || 'cover-video.mp4'
      mimetype = (file as File).type || 'video/mp4'
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0) return c.json({ error: 'file required' }, 400)

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024
  if (fileData.byteLength > MAX_VIDEO_BYTES) return c.json({ error: 'Video maksimal 20MB' }, 413)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat mengubah video sampul' }, 403)
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const relPath = `${albumId}/cover-video.${safeExt}`

  try {
    await putAlbumPhoto(bucket, relPath, fileData, {
      contentType: mimetype,
      cacheControl: 'public, max-age=3600',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ error: msg || 'Upload video sampul gagal' }, 500)
  }

  const videoUrl = publicAlbumAssetUrl(c, relPath)

  const r = await db
    .prepare(`UPDATE albums SET cover_video_url = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(videoUrl, albumId)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  return c.json({ cover_video_url: videoUrl })
})

// DELETE /api/albums/:id/cover-video
albumCoverVideoRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat menghapus video sampul' }, 403)
  }

  const upd = await db
    .prepare(`UPDATE albums SET cover_video_url = NULL, updated_at = datetime('now') WHERE id = ?`)
    .bind(albumId)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  return c.json({ message: 'Video sampul dihapus' })
})

export default albumCoverVideoRoute
