import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject } from '../../../../lib/r2-assets'
import { parseJsonArray } from '../../../../lib/d1-json'

const albumsIdPhotosPhotoId = new Hono()

// DELETE /api/albums/:id/photos/:photoId — photoId format: "studentName-index" (index is last -\\d+$)
albumsIdPhotosPhotoId.delete('/', async (c) => {
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
  const photoId = c.req.param('photoId')
  if (!albumId || !photoId) return c.json({ error: 'Album ID and photo ID required' }, 400)

  const m = photoId.match(/^(.+)-(\d+)$/)
  if (!m) return c.json({ error: 'Format photoId tidak valid' }, 400)
  const studentName = m[1]
  const index = parseInt(m[2], 10)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'

  const rows = await db
    .prepare(
      `SELECT class_id, photos, student_name FROM album_class_access WHERE album_id = ? AND student_name = ?`
    )
    .bind(albumId, studentName)
    .all<{ class_id: string; photos: string; student_name: string | null }>()

  let target: { class_id: string; photos: string; student_name: string | null } | null = null
  for (const r of rows.results ?? []) {
    const photos = parseJsonArray(r.photos) as string[]
    if (index >= 0 && index < photos.length) {
      target = r
      break
    }
  }
  if (!target) return c.json({ error: 'Foto tidak ditemukan' }, 404)

  if (!isOwner) {
    const access = await db
      .prepare(
        `SELECT id FROM album_class_access WHERE class_id = ? AND user_id = ? AND status = 'approved' AND student_name = ?`
      )
      .bind(target.class_id, user.id, studentName)
      .first<{ id: string }>()
    if (!access) {
      return c.json({ error: 'Anda hanya dapat menghapus foto profil Anda sendiri' }, 403)
    }
  }

  const photos = parseJsonArray(target.photos) as string[]
  const removedUrl = photos[index]
  const updatedPhotos = photos.filter((_, i) => i !== index)

  try {
    const pathPart = removedUrl.split('/api/files/')[1]
    if (pathPart) {
      const decoded = decodeURIComponent(pathPart.replace(/\/+/g, '/'))
      const rel = decoded.replace(/^album-photos\//, '')
      await deleteAlbumObject(bucket, rel)
    }
  } catch {
    /* ignore */
  }

  const upd = await db
    .prepare(
      `UPDATE album_class_access SET photos = ?, updated_at = datetime('now') WHERE album_id = ? AND class_id = ? AND student_name = ?`
    )
    .bind(JSON.stringify(updatedPhotos), albumId, target.class_id, studentName)
    .run()
  if (!upd.success) return c.json({ error: 'Gagal menghapus' }, 500)
  return c.json({ message: 'Foto dihapus' })
})

export default albumsIdPhotosPhotoId
