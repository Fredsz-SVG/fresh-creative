import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject, putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../../lib/public-file-url'
import { parseJsonArray } from '../../../../lib/d1-json'

const albumsIdPhotos = new Hono()

// GET /api/albums/:id/photos
albumsIdPhotos.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const searchParams = c.req.query()
  const classId = searchParams['class_id']
  const studentName = searchParams['student_name']
  if (!classId) return c.json({ error: 'class_id required' }, 400)

  const role = await getRole(c, user)
  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  const isOwnerOrAdmin = album && (album.user_id === user.id || role === 'admin')

  const cls = await db
    .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string; album_id: string }>()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  let records: { student_name: string | null; photos: string; created_at: string | null }[] = []
  if (studentName != null && studentName !== '') {
    const row = await db
      .prepare(
        `SELECT student_name, photos, created_at FROM album_class_access WHERE album_id = ? AND class_id = ? AND student_name = ?`
      )
      .bind(albumId, classId, decodeURIComponent(studentName))
      .all<{ student_name: string | null; photos: string; created_at: string | null }>()
    records = row.results ?? []
  } else {
    if (!isOwnerOrAdmin) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const row = await db
      .prepare(
        `SELECT student_name, photos, created_at FROM album_class_access WHERE album_id = ? AND class_id = ?`
      )
      .bind(albumId, classId)
      .all<{ student_name: string | null; photos: string; created_at: string | null }>()
    records = row.results ?? []
  }

  const photos = records.flatMap((r) => {
    const studentPhotos = parseJsonArray(r.photos) as string[]
    return studentPhotos.map((url, idx) => ({
      id: `${r.student_name}-${idx}`,
      file_url: url,
      student_name: r.student_name,
      created_at: r.created_at,
    }))
  })
  return c.json(photos)
})

// DELETE /api/albums/:id/photos?class_id=&student_name=&index=
albumsIdPhotos.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const classId = c.req.query('class_id') || ''
  const studentName = c.req.query('student_name') ? decodeURIComponent(c.req.query('student_name')!) : ''
  const indexStr = c.req.query('index') || ''
  const index = parseInt(indexStr, 10)
  if (!classId || !studentName || Number.isNaN(index)) {
    return c.json({ error: 'class_id, student_name, and index required' }, 400)
  }

  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (!isOwner) {
    const access = await db
      .prepare(
        `SELECT id, photos FROM album_class_access WHERE album_id = ? AND class_id = ? AND user_id = ? AND status = 'approved' AND student_name = ?`
      )
      .bind(albumId, classId, user.id, studentName)
      .first<{ id: string; photos: string }>()
    if (!access) return c.json({ error: 'Forbidden' }, 403)
  }

  const row = await db
    .prepare(
      `SELECT photos FROM album_class_access WHERE album_id = ? AND class_id = ? AND student_name = ?`
    )
    .bind(albumId, classId, studentName)
    .first<{ photos: string }>()
  if (!row) return c.json({ error: 'Not found' }, 404)

  const arr = parseJsonArray(row.photos) as string[]
  if (index < 0 || index >= arr.length) return c.json({ error: 'Invalid index' }, 400)
  const removedUrl = arr[index]
  const updatedPhotos = arr.filter((_, i) => i !== index)

  try {
    const pathPart = removedUrl.split('/api/files/')[1]
    if (pathPart) {
      const decoded = decodeURIComponent(pathPart.replace(/\/+/g, '/'))
      const rel = decoded.replace(/^album-photos\//, '')
      await deleteAlbumObject(bucket, rel)
    }
  } catch {
    /* best-effort */
  }

  const upd = await db
    .prepare(
      `UPDATE album_class_access SET photos = ?, updated_at = datetime('now') WHERE album_id = ? AND class_id = ? AND student_name = ?`
    )
    .bind(JSON.stringify(updatedPhotos), albumId, classId, studentName)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  return c.json({ message: 'Foto dihapus' })
})

// POST /api/albums/:id/photos
albumsIdPhotos.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'image/jpeg'
  let classId = ''
  let studentName = ''

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file != null && typeof file !== 'string') {
      fileData = await (file as Blob).arrayBuffer()
      filename = (file as File).name || 'photo.jpg'
      mimetype = (file as File).type || 'image/jpeg'
    }
    const ci = formData.get('class_id')
    if (ci) classId = ci.toString().trim()
    const sn = formData.get('student_name')
    if (sn) studentName = sn.toString().trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0 || !classId) {
    return c.json({ error: 'file and class_id required' }, 400)
  }

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024
  if (fileData.byteLength > MAX_PHOTO_BYTES) return c.json({ error: 'Foto maksimal 10MB' }, 413)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (!isOwner) {
    const member = await db
      .prepare(`SELECT album_id FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ album_id: string }>()
    if (!member) {
      const classAccess = await db
        .prepare(
          `SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
        )
        .bind(albumId, user.id)
        .first<{ id: string }>()
      if (!classAccess) return c.json({ error: 'No access to album' }, 403)
    }
  }

  const cls = await db
    .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string; album_id: string }>()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  // Permission model:
  // - Owner / global admin: boleh upload untuk siapa saja (butuh student_name untuk memilih record).
  // - Member approved: hanya boleh upload untuk record miliknya sendiri (student_name dari DB sebagai source of truth).
  let targetAccess: { id: string; student_name: string | null; photos: string } | null = null
  if (isOwner) {
    if (!studentName) return c.json({ error: 'student_name required' }, 400)
    targetAccess = await db
      .prepare(
        `SELECT id, student_name, photos FROM album_class_access WHERE album_id = ? AND class_id = ? AND student_name = ?`
      )
      .bind(albumId, classId, studentName)
      .first<{ id: string; student_name: string | null; photos: string }>()
  } else {
    targetAccess = await db
      .prepare(
        `SELECT id, student_name, photos FROM album_class_access WHERE album_id = ? AND class_id = ? AND user_id = ? AND status = 'approved'`
      )
      .bind(albumId, classId, user.id)
      .first<{ id: string; student_name: string | null; photos: string }>()
    // Untuk member, kalau UI tidak kirim student_name atau beda, kita tetap pakai dari DB.
    studentName = targetAccess?.student_name || studentName
  }
  if (!targetAccess) return c.json({ error: 'Access record not found' }, 404)

  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const relPath = `${albumId}/${classId}/${crypto.randomUUID()}.${safeExt}`

  try {
    await putAlbumPhoto(bucket, relPath, fileData, { contentType: mimetype })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Upload gagal' }, 500)
  }

  const fileUrl = publicAlbumAssetUrl(c, relPath)

  const currentPhotos = parseJsonArray(targetAccess.photos) as string[]
  if (currentPhotos.length >= 4) return c.json({ error: 'Maksimal 4 foto per siswa' }, 400)

  const updatedPhotos = [...currentPhotos, fileUrl]
  const upd = await db
    .prepare(
      `UPDATE album_class_access SET photos = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(JSON.stringify(updatedPhotos), targetAccess.id)
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)

  return c.json({
    id: crypto.randomUUID(),
    file_url: fileUrl,
    student_name: studentName,
    photo_index: updatedPhotos.length - 1,
    total_photos: updatedPhotos.length,
  })
})

export default albumsIdPhotos
