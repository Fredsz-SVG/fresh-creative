import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject, putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../../lib/public-file-url'

const teacherVideo = new Hono()

teacherVideo.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const formData = await c.req.formData()
    const rawFile = formData.get('file')
    if (rawFile == null || typeof rawFile === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }
    const file = rawFile as File

    if (file.size === 0) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const MAX_VIDEO_BYTES = 20 * 1024 * 1024
    if (file.size > MAX_VIDEO_BYTES) {
      return c.json({ error: 'Video maksimal 20MB' }, 413)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const isGlobalAdmin = (await getRole(c, user)) === 'admin'

    if (!isGlobalAdmin) {
      const album = await db
        .prepare(`SELECT user_id FROM albums WHERE id = ?`)
        .bind(albumId)
        .first<{ user_id: string }>()

      if (!album) {
        return c.json({ error: 'Album not found' }, 404)
      }

      const isOwner = album.user_id === user.id

      if (!isOwner) {
        const member = await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()

        if (!member || member.role !== 'admin') {
          return c.json({ error: 'Forbidden' }, 403)
        }
      }
    }

    const teacher = await db
      .prepare(`SELECT id, video_url FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ id: string; video_url: string | null }>()

    if (!teacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }

    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await deleteAlbumObject(bucket, `teachers/${teacherId}/videos/${fileName}`)
      } catch {
        console.error('Error deleting old video')
      }
    }

    const filename = file.name || 'video.mp4'
    const mimetype = file.type || 'video/mp4'
    const fileExt = filename.split('.').pop() || 'mp4'
    const newFileName = `${Date.now()}.${fileExt}`
    const relPath = `teachers/${teacherId}/videos/${newFileName}`

    const fileBuffer = await file.arrayBuffer()

    try {
      await putAlbumPhoto(bucket, relPath, fileBuffer, { contentType: mimetype, cacheControl: 'public, max-age=3600' })
    } catch (e: unknown) {
      console.error('Storage upload error:', e)
      return c.json({ error: e instanceof Error ? e.message : 'Upload failed' }, 500)
    }

    const publicUrl = publicAlbumAssetUrl(c, relPath)

    const upd = await db
      .prepare(`UPDATE album_teachers SET video_url = ?, updated_at = datetime('now') WHERE id = ? AND album_id = ?`)
      .bind(publicUrl, teacherId, albumId)
      .run()

    if (!upd.success) {
      return c.json({ error: 'Update failed' }, 500)
    }

    return c.json({ video_url: publicUrl })
  } catch (error: unknown) {
    console.error('Error in POST teacher video:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

teacherVideo.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const isGlobalAdmin = (await getRole(c, user)) === 'admin'

    if (!isGlobalAdmin) {
      const album = await db
        .prepare(`SELECT user_id FROM albums WHERE id = ?`)
        .bind(albumId)
        .first<{ user_id: string }>()

      if (!album) {
        return c.json({ error: 'Album not found' }, 404)
      }

      const isOwner = album.user_id === user.id

      if (!isOwner) {
        const member = await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()

        if (!member || member.role !== 'admin') {
          return c.json({ error: 'Forbidden' }, 403)
        }
      }
    }

    const teacher = await db
      .prepare(`SELECT video_url FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ video_url: string | null }>()

    if (!teacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }

    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await deleteAlbumObject(bucket, `teachers/${teacherId}/videos/${fileName}`)
      } catch {
        console.error('Error deleting video from storage')
      }
    }

    const upd = await db
      .prepare(`UPDATE album_teachers SET video_url = NULL, updated_at = datetime('now') WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .run()

    if (!upd.success) {
      return c.json({ error: 'Update failed' }, 500)
    }

    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('Error in DELETE video:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
})

export default teacherVideo
