import { Hono } from 'hono'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../../lib/public-file-url'
import { AppEnv, requireAuthJwt } from '../../../../middleware'
import { getAuthUserFromContext } from '../../../../lib/auth-user'

const teacherIdPhotos = new Hono<AppEnv>()
teacherIdPhotos.use('*', requireAuthJwt)

// POST /api/albums/:id/teachers/:teacherId/photos
teacherIdPhotos.post('/', async (c) => {
  try {
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    let fileData: ArrayBuffer | null = null
    let filename = ''
    let mimetype = 'image/jpeg'

    try {
      const formData = await c.req.formData()
      const file = formData.get('file')
      if (file != null && typeof file !== 'string') {
        fileData = await (file as Blob).arrayBuffer()
        filename = (file as File).name || 'photo.jpg'
        mimetype = (file as File).type || 'image/jpeg'
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg || 'Invalid multipart body' }, 400)
    }

    if (!fileData || fileData.byteLength === 0) return c.json({ error: 'No file provided' }, 400)

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

    const teacher = await db
      .prepare(`SELECT id FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ id: string }>()
    if (!teacher) return c.json({ error: 'Teacher not found' }, 404)

    const fileExt = filename.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}.${fileExt}`
    const relPath = `teachers/${teacherId}/${fileName}`

    try {
      await putAlbumPhoto(bucket, relPath, fileData, { contentType: mimetype })
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : 'Upload failed' }, 500)
    }

    const publicUrl = publicAlbumAssetUrl(c, relPath)

    const maxSort = await db
      .prepare(
        `SELECT sort_order FROM album_teacher_photos WHERE teacher_id = ? ORDER BY sort_order DESC LIMIT 1`
      )
      .bind(teacherId)
      .first<{ sort_order: number | null }>()
    const nextSort = (maxSort?.sort_order ?? -1) + 1

    const photoId = crypto.randomUUID()
    const ins = await db
      .prepare(
        `INSERT INTO album_teacher_photos (id, teacher_id, file_url, sort_order, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(photoId, teacherId, publicUrl, nextSort)
      .run()
    if (!ins.success) return c.json({ error: 'Insert failed' }, 500)

    const row = await db
      .prepare(`SELECT * FROM album_teacher_photos WHERE id = ?`)
      .bind(photoId)
      .first()
    return c.json(row, 201)
  } catch (error: unknown) {
    console.error('Error in POST teacher photos:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default teacherIdPhotos
