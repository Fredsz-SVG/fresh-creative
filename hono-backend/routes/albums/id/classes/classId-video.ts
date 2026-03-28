import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const classIdVideo = new Hono()

// POST /api/albums/:id/classes/:classId/video
classIdVideo.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'video/mp4'
  let studentName = ''

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file && file instanceof File) {
      fileData = await file.arrayBuffer()
      filename = file.name || 'video.mp4'
      mimetype = file.type || 'video/mp4'
    }
    const sn = formData.get('student_name')
    if (sn) studentName = sn.toString().trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0 || !studentName) {
    return c.json({ error: 'file dan student_name required' }, 400)
  }

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024
  if (fileData.byteLength > MAX_VIDEO_BYTES) return c.json({ error: 'Video maksimal 20MB' }, 413)

  const admin = getAdminSupabaseClient(c?.env as any)
  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(supabase, user)
  const isOwner = (album as any).user_id === user.id || role === 'admin'
  if (!isOwner) {
    const { data: access } = await admin
      .from('album_class_access').select('id')
      .eq('class_id', classId).eq('user_id', user.id).eq('status', 'approved').eq('student_name', studentName)
      .maybeSingle()
    if (!access) return c.json({ error: 'Anda hanya dapat upload video untuk profil Anda sendiri' }, 403)
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const safeName = studentName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '')
  const path = `${albumId}/${classId}/videos/${safeName}-${Date.now()}.${safeExt}`

  const { error: uploadErr } = await admin.storage
    .from('album-photos').upload(path, fileData, { contentType: mimetype, upsert: false })
  if (uploadErr) return c.json({ error: uploadErr.message || 'Upload video gagal' }, 500)

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
  const videoUrl = urlData.publicUrl

  const { error: updateErr } = await admin
    .from('album_class_access')
    .update({ video_url: videoUrl, updated_at: new Date().toISOString() })
    .eq('class_id', classId).eq('student_name', studentName)

  if (updateErr) return c.json({ error: updateErr.message }, 500)
  return c.json({ video_url: videoUrl })
})

export default classIdVideo
