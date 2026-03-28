import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'

const teacherIdPhotos = new Hono()

// POST /api/albums/:id/teachers/:teacherId/photos
teacherIdPhotos.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    let fileData: ArrayBuffer | null = null
    let filename = ''
    let mimetype = 'image/jpeg'

    try {
      const formData = await c.req.formData()
      const file = formData.get('file')
      if (file && file instanceof File) {
        fileData = await file.arrayBuffer()
        filename = file.name || 'photo.jpg'
        mimetype = file.type || 'image/jpeg'
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg || 'Invalid multipart body' }, 400)
    }

    if (!fileData || fileData.byteLength === 0) return c.json({ error: 'No file provided' }, 400)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      const { data: album } = await supabase.from('albums').select('user_id').eq('id', albumId).maybeSingle()
      if (!album) return c.json({ error: 'Album not found' }, 404)
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
        if (!member || !['admin', 'owner'].includes(member.role)) return c.json({ error: 'Forbidden' }, 403)
      }
    }

    const { data: teacher } = await supabase
      .from('album_teachers').select('id').eq('id', teacherId).eq('album_id', albumId).maybeSingle()
    if (!teacher) return c.json({ error: 'Teacher not found' }, 404)

    const fileExt = filename.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('album-photos').upload(filePath, fileData, { contentType: mimetype })
    if (uploadError) return c.json({ error: uploadError.message }, 500)

    const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(filePath)

    const { data: maxSort } = await supabase
      .from('album_teacher_photos').select('sort_order').eq('teacher_id', teacherId)
      .order('sort_order', { ascending: false }).limit(1).maybeSingle()

    const nextSort = (maxSort?.sort_order ?? -1) + 1

    const { data: newPhotos, error: insertError } = await supabase
      .from('album_teacher_photos')
      .insert({ teacher_id: teacherId, file_url: publicUrl, sort_order: nextSort })
      .select()

    if (insertError) return c.json({ error: insertError.message }, 500)
    if (!newPhotos || newPhotos.length === 0) return c.json({ error: 'Failed to create photo record' }, 500)

    return c.json(newPhotos[0], 201)
  } catch (error: any) {
    console.error('Error in POST teacher photos:', error)
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default teacherIdPhotos
