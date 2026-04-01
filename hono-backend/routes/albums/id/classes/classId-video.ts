import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl } from '../../../../lib/public-file-url'

const classIdVideo = new Hono()

// POST /api/albums/:id/classes/:classId/video
classIdVideo.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  const bucket = getAssets(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'video/mp4'
  let studentName = ''
  let accessId: string | null = null

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file != null && typeof file !== 'string') {
      fileData = await (file as Blob).arrayBuffer()
      filename = (file as File).name || 'video.mp4'
      mimetype = (file as File).type || 'video/mp4'
    }
    const sn = formData.get('student_name')
    if (sn) studentName = sn.toString().trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0) {
    return c.json({ error: 'file required' }, 400)
  }

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024
  if (fileData.byteLength > MAX_VIDEO_BYTES) return c.json({ error: 'Video maksimal 20MB' }, 413)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(c, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (!isOwner) {
    const access = await db
      .prepare(
        `SELECT id, student_name FROM album_class_access WHERE album_id = ? AND class_id = ? AND user_id = ? AND status = 'approved'`
      )
      .bind(albumId, classId, user.id)
      .first<{ id: string; student_name: string | null }>()
    if (!access) return c.json({ error: 'Anda hanya dapat upload video untuk profil Anda sendiri' }, 403)
    // Source of truth dari DB agar tidak gagal karena student_name di UI beda/blank
    studentName = access.student_name || studentName || user.id
    accessId = access.id
  } else {
    if (!studentName) return c.json({ error: 'student_name required' }, 400)
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const safeName = studentName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '')
  const relPath = `${albumId}/${classId}/videos/${safeName}-${Date.now()}.${safeExt}`

  try {
    await putAlbumPhoto(bucket, relPath, fileData, { contentType: mimetype })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ error: msg || 'Upload video gagal' }, 500)
  }

  const videoUrl = publicAlbumAssetUrl(c, relPath)

  const upd = await db
    .prepare(
      `UPDATE album_class_access SET video_url = ?, updated_at = datetime('now') WHERE ${
        isOwner ? 'class_id = ? AND student_name = ? AND album_id = ?' : 'id = ?'
      }`
    )
    .bind(
      ...(isOwner ? [videoUrl, classId, studentName, albumId] : [videoUrl, accessId])
    )
    .run()
  if (!upd.success) return c.json({ error: 'Update failed' }, 500)
  return c.json({ video_url: videoUrl })
})

export default classIdVideo
