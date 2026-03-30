import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject } from '../../../../lib/r2-assets'

const albumsIdTeachersTeacherIdPhotosPhotoId = new Hono()

// DELETE /api/albums/:id/teachers/:teacherId/photos/:photoId
albumsIdTeachersTeacherIdPhotosPhotoId.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
    const photoId = c.req.param('photoId')
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
    const photo = await db
      .prepare(`SELECT file_url FROM album_teacher_photos WHERE id = ? AND teacher_id = ?`)
      .bind(photoId, teacherId)
      .first<{ file_url: string }>()
    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404)
    }
    try {
      const urlParts = photo.file_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      await deleteAlbumObject(bucket, `teachers/${teacherId}/${fileName}`)
    } catch {
      /* continue */
    }
    const del = await db.prepare(`DELETE FROM album_teacher_photos WHERE id = ?`).bind(photoId).run()
    if (!del.success) return c.json({ error: 'Delete failed' }, 500)
    return c.json({ success: true }, 200)
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default albumsIdTeachersTeacherIdPhotosPhotoId
