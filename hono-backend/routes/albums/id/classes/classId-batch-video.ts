import { Hono } from 'hono'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject, putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl, getR2KeyFromPublicUrl } from '../../../../lib/public-file-url'
import { albumPathFromR2Key } from '../../../../lib/storage-layout'
import { AppEnv, requireAuthJwt } from '../../../../middleware'
import { getAuthUserFromContext } from '../../../../lib/auth-user'

const classIdBatchVideo = new Hono<AppEnv>()
classIdBatchVideo.use('*', requireAuthJwt)

// POST /api/albums/:id/classes/:classId/batch-video
classIdBatchVideo.post('/', async (c) => {
  try {
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const classId = c.req.param('classId')

    const user = getAuthUserFromContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const isGlobalAdmin = (await getRole(c, user)) === 'admin'

    if (!isGlobalAdmin) {
      const album = await db
        .prepare(`SELECT user_id FROM albums WHERE id = ?`)
        .bind(albumId)
        .first<{ user_id: string }>()
      if (!album) return c.json({ error: 'Album not found' }, 404)
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const member = await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()
        if (!member || member.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
      }
    }

    const classObj = await db
      .prepare(`SELECT batch_video_url FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ batch_video_url: string | null }>()
    if (!classObj) return c.json({ error: 'Class not found' }, 404)

    const formData = await c.req.formData()
    const rawFile = formData.get('file')
    if (rawFile == null || typeof rawFile === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }
    const file = rawFile as File
    if (!file.type.startsWith('video/')) return c.json({ error: 'File must be a video' }, 400)
    if (file.size > 20 * 1024 * 1024) return c.json({ error: 'Video maksimal 20MB' }, 413)

    if (classObj.batch_video_url) {
      const oldKey = getR2KeyFromPublicUrl(c, classObj.batch_video_url)
      if (oldKey) {
        try {
          await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
        } catch (e) {
          console.error('Failed to cleanup old batch video:', e)
        }
      }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const relPath = `classes/${classId}/videos/${fileName}`
    const fileBuffer = await file.arrayBuffer()

    try {
      await putAlbumPhoto(bucket, relPath, fileBuffer, { contentType: file.type })
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : 'Upload failed' }, 500)
    }

    const publicUrl = publicAlbumAssetUrl(c, relPath)

    const upd = await db
      .prepare(`UPDATE album_classes SET batch_video_url = ? WHERE id = ? AND album_id = ?`)
      .bind(publicUrl, classId, albumId)
      .run()

    if (!upd.success) {
      await deleteAlbumObject(bucket, relPath)
      return c.json({ error: 'Update failed' }, 500)
    }

    const updatedClass = await db
      .prepare(`SELECT id, name, sort_order, batch_photo_url, batch_video_url FROM album_classes WHERE id = ?`)
      .bind(classId)
      .first()
    return c.json(updatedClass)
  } catch (error: unknown) {
    console.error('Error in POST class batch video:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/classes/:classId/batch-video
classIdBatchVideo.delete('/', async (c) => {
  try {
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const classId = c.req.param('classId')

    const user = getAuthUserFromContext(c)
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const isGlobalAdmin = (await getRole(c, user)) === 'admin'

    if (!isGlobalAdmin) {
      const album = await db
        .prepare(`SELECT user_id FROM albums WHERE id = ?`)
        .bind(albumId)
        .first<{ user_id: string }>()
      if (!album) return c.json({ error: 'Album not found' }, 404)
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const member = await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()
        if (!member || member.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
      }
    }

    const classObj = await db
      .prepare(`SELECT batch_video_url FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ batch_video_url: string | null }>()
    if (!classObj) return c.json({ error: 'Class not found' }, 404)
    if (!classObj.batch_video_url) return c.json({ error: 'No video to delete' }, 400)

    const oldKey = getR2KeyFromPublicUrl(c, classObj.batch_video_url)
    if (oldKey) {
      try {
        await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
      } catch (e) {
        console.error('Failed to delete batch video from R2:', e)
      }
    }

    const upd = await db
      .prepare(`UPDATE album_classes SET batch_video_url = NULL WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .run()
    if (!upd.success) return c.json({ error: 'Update failed' }, 500)

    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('Error in DELETE class batch video:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default classIdBatchVideo
