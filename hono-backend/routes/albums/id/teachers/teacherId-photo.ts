import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject, putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl, getR2KeyFromPublicUrl } from '../../../../lib/public-file-url'
import { albumPathFromR2Key } from '../../../../lib/storage-layout'

const teacherIdPhoto = new Hono()

// POST /api/albums/:id/teachers/:teacherId/photo
teacherIdPhoto.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

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

    const teacher = await db
      .prepare(`SELECT photo_url FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ photo_url: string | null }>()
    if (!teacher) return c.json({ error: 'Teacher not found' }, 404)

    const formData = await c.req.formData()
    const rawFile = formData.get('file')
    if (rawFile == null || typeof rawFile === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }
    const file = rawFile as File
    if (!file.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400)
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Foto maksimal 10MB' }, 413)

    if (teacher.photo_url) {
      const oldKey = getR2KeyFromPublicUrl(c, teacher.photo_url)
      if (oldKey) {
        try {
          await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
        } catch (e) {
          console.error('Failed to cleanup old teacher photo:', e)
        }
      }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const relPath = `teachers/${teacherId}/${fileName}`
    const fileBuffer = await file.arrayBuffer()

    try {
      await putAlbumPhoto(bucket, relPath, fileBuffer, { contentType: file.type })
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : 'Upload failed' }, 500)
    }

    const publicUrl = publicAlbumAssetUrl(c, relPath)

    const upd = await db
      .prepare(
        `UPDATE album_teachers SET photo_url = ?, updated_at = datetime('now') WHERE id = ? AND album_id = ?`
      )
      .bind(publicUrl, teacherId, albumId)
      .run()

    if (!upd.success) {
      await deleteAlbumObject(bucket, relPath)
      return c.json({ error: 'Update failed' }, 500)
    }

    const updated = await db
      .prepare(`SELECT * FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first()
    if (!updated) {
      await deleteAlbumObject(bucket, relPath)
      return c.json({ error: 'Teacher not found' }, 404)
    }

    return c.json(updated)
  } catch (error: unknown) {
    console.error('Error in POST teacher photo:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/teachers/:teacherId/photo
teacherIdPhoto.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

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

    const teacher = await db
      .prepare(`SELECT photo_url FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ photo_url: string | null }>()
    if (!teacher) return c.json({ error: 'Teacher not found' }, 404)
    if (!teacher.photo_url) return c.json({ error: 'No photo to delete' }, 400)

    if (teacher.photo_url) {
      const oldKey = getR2KeyFromPublicUrl(c, teacher.photo_url)
      if (oldKey) {
        try {
          await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
        } catch (e) {
          console.error('Failed to delete teacher photo from R2:', e)
        }
      }
    }

    const upd = await db
      .prepare(
        `UPDATE album_teachers SET photo_url = NULL, updated_at = datetime('now') WHERE id = ? AND album_id = ?`
      )
      .bind(teacherId, albumId)
      .run()
    if (!upd.success) return c.json({ error: 'Update failed' }, 500)

    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('Error in DELETE teacher photo:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default teacherIdPhoto
