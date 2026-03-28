import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const albumsIdPhotos = new Hono()

// GET /api/albums/:id/photos
albumsIdPhotos.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const searchParams = c.req.query()
  const classId = searchParams['class_id']
  const studentName = searchParams['student_name']
  if (!classId) return c.json({ error: 'class_id required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const role = await getRole(supabase, user)
  const { data: album } = await (admin ?? supabase).from('albums').select('id, user_id').eq('id', albumId).single()
  const isOwnerOrAdmin = album && ((album as { user_id: string }).user_id === user.id || role === 'admin')
  const client = isOwnerOrAdmin && admin ? admin : supabase

  const { data: cls } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  let query = client
    .from('album_class_access')
    .select('student_name, photos, created_at')
    .eq('album_id', albumId)
    .eq('class_id', classId)

  if (studentName != null && studentName !== '') {
    query = query.eq('student_name', decodeURIComponent(studentName))
  }

  const { data: records, error } = await query
  if (error) return c.json({ error: error.message }, 500)

  const photos = (records || []).flatMap((r: any) => {
    const studentPhotos = (r.photos as string[]) || []
    return studentPhotos.map((url, idx) => ({
      id: `${r.student_name}-${idx}`,
      file_url: url,
      student_name: r.student_name,
      created_at: r.created_at
    }))
  })
  return c.json(photos)
})

// POST /api/albums/:id/photos
albumsIdPhotos.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
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
    if (file && file instanceof File) {
      fileData = await file.arrayBuffer()
      filename = file.name || 'photo.jpg'
      mimetype = file.type || 'image/jpeg'
    }
    const ci = formData.get('class_id')
    if (ci) classId = ci.toString().trim()
    const sn = formData.get('student_name')
    if (sn) studentName = sn.toString().trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0 || !classId || !studentName) {
    return c.json({ error: 'file, class_id, and student_name required' }, 400)
  }

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024
  if (fileData.byteLength > MAX_PHOTO_BYTES) return c.json({ error: 'Foto maksimal 10MB' }, 413)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(supabase, user)
  const isOwner = (album as any).user_id === user.id || role === 'admin'
  if (!isOwner) {
    const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    if (!member) {
      const { data: classAccess } = await client
        .from('album_class_access').select('id').eq('album_id', albumId).eq('user_id', user.id).eq('status', 'approved').maybeSingle()
      if (!classAccess) return c.json({ error: 'No access to album' }, 403)
    }
  }

  const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  if (!isOwner) {
    const { data: access } = await client
      .from('album_class_access').select('id').eq('class_id', classId).eq('user_id', user.id).eq('status', 'approved').eq('student_name', studentName).maybeSingle()
    if (!access) return c.json({ error: 'Anda harus punya akses disetujui untuk nama ini di kelas ini' }, 403)
  }

  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${albumId}/${classId}/${crypto.randomUUID()}.${safeExt}`

  const { data: uploadData, error: uploadErr } = await (admin ?? supabase).storage
    .from('album-photos').upload(path, fileData, { contentType: mimetype, upsert: false })
  if (uploadErr) return c.json({ error: uploadErr.message || 'Upload gagal' }, 500)

  const { data: urlData } = (admin ?? supabase).storage.from('album-photos').getPublicUrl(uploadData.path)
  const fileUrl = urlData.publicUrl

  const { data: accessRecord } = await client
    .from('album_class_access').select('photos').eq('album_id', albumId).eq('class_id', classId).eq('student_name', studentName).maybeSingle()
  if (!accessRecord) return c.json({ error: 'Access record not found' }, 404)

  const currentPhotos = (accessRecord.photos as string[]) || []
  if (currentPhotos.length >= 4) return c.json({ error: 'Maksimal 4 foto per siswa' }, 400)

  const updatedPhotos = [...currentPhotos, fileUrl]
  const { error: updateErr } = await client
    .from('album_class_access').update({ photos: updatedPhotos }).eq('album_id', albumId).eq('class_id', classId).eq('student_name', studentName)
  if (updateErr) return c.json({ error: updateErr.message }, 500)

  return c.json({
    id: crypto.randomUUID(),
    file_url: fileUrl,
    student_name: studentName,
    photo_index: updatedPhotos.length - 1,
    total_photos: updatedPhotos.length
  })
})


export default albumsIdPhotos
