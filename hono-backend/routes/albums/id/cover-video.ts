import { Hono } from 'hono'
import { getRole } from '../../../lib/auth'
import { getD1, getAssets } from '../../../lib/edge-env'
import { putAlbumPhoto, deleteAlbumObject } from '../../../lib/r2-assets'
import { publicAlbumAssetUrl, getR2KeyFromPublicUrl } from '../../../lib/public-file-url'
import { albumPathFromR2Key } from '../../../lib/storage-layout'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'

const albumCoverVideoRoute = new Hono<AppEnv>()
albumCoverVideoRoute.use('*', requireAuthJwt)

// POST /api/albums/:id/cover-video
albumCoverVideoRoute.post('/', async (c) => {
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
  const user = getAuthUserFromContext(c)
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
    .prepare(`SELECT id, user_id, cover_video_url FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string; cover_video_url: string | null }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat mengubah video sampul' }, 403)
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const relPath = `${albumId}/cover-video.${safeExt}`

  // Cleanup old video if exists
  if (album.cover_video_url) {
    const oldKey = getR2KeyFromPublicUrl(c, album.cover_video_url)
    if (oldKey) {
      try {
        await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
      } catch (e) {
        console.error('Failed to cleanup old cover video:', e)
      }
    }
  }

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
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id, cover_video_url FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string; cover_video_url: string | null }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat menghapus video sampul' }, 403)
  }

  const assets = getAssets(c)
  if (assets && album.cover_video_url) {
    const oldKey = getR2KeyFromPublicUrl(c, album.cover_video_url)
    if (oldKey) {
      try {
        await deleteAlbumObject(assets, albumPathFromR2Key(oldKey))
      } catch (e) {
        console.error('Failed to delete cover video from R2:', e)
      }
    }
  }

  const upd = await db
    .prepare(`UPDATE albums SET cover_video_url = NULL, updated_at = datetime('now') WHERE id = ?`)
    .bind(albumId)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  return c.json({ message: 'Video sampul dihapus' })
})

export default albumCoverVideoRoute
