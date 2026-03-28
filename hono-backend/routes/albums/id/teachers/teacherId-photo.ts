import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'

const teacherIdPhoto = new Hono()

// POST /api/albums/:id/teachers/:teacherId/photo
teacherIdPhoto.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      const { data: album, error: albumError } = await supabase
        .from('albums').select('user_id').eq('id', albumId).maybeSingle()
      if (albumError || !album) return c.json({ error: 'Album not found' }, 404)
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
        if (!member || !['admin', 'owner'].includes(member.role)) return c.json({ error: 'Forbidden' }, 403)
      }
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('album_teachers').select('photo_url').eq('id', teacherId).eq('album_id', albumId).maybeSingle()
    if (teacherError || !teacher) return c.json({ error: 'Teacher not found' }, 404)

    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)
    if (!file.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400)
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Foto maksimal 10MB' }, 413)

    const bucket = 'album-photos'
    if (teacher.photo_url) {
      try {
        const urlParts = teacher.photo_url.split('/')
        const oldFileName = urlParts[urlParts.length - 1]
        await supabase.storage.from(bucket).remove([`teachers/${teacherId}/${oldFileName}`])
      } catch (error) { console.error('Error deleting old photo:', error) }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/${fileName}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from(bucket).upload(filePath, fileBuffer, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (uploadError) return c.json({ error: uploadError.message }, 500)

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

    const { data: updatedTeachers, error: updateError } = await supabase
      .from('album_teachers').update({ photo_url: publicUrl }).eq('id', teacherId).eq('album_id', albumId).select()

    if (updateError) {
      await supabase.storage.from(bucket).remove([filePath])
      return c.json({ error: updateError.message }, 500)
    }

    if (!updatedTeachers || updatedTeachers.length === 0) {
      await supabase.storage.from(bucket).remove([filePath])
      return c.json({ error: 'Teacher not found' }, 404)
    }

    return c.json(updatedTeachers[0])
  } catch (error: any) {
    console.error('Error in POST teacher photo:', error)
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/teachers/:teacherId/photo
teacherIdPhoto.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      const { data: album, error: albumError } = await supabase
        .from('albums').select('user_id').eq('id', albumId).maybeSingle()
      if (albumError || !album) return c.json({ error: 'Album not found' }, 404)
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
        if (!member || !['admin', 'owner'].includes(member.role)) return c.json({ error: 'Forbidden' }, 403)
      }
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('album_teachers').select('photo_url').eq('id', teacherId).eq('album_id', albumId).maybeSingle()
    if (teacherError || !teacher) return c.json({ error: 'Teacher not found' }, 404)
    if (!teacher.photo_url) return c.json({ error: 'No photo to delete' }, 400)

    try {
      const urlParts = teacher.photo_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      await supabase.storage.from('album-photos').remove([`teachers/${teacherId}/${fileName}`])
    } catch (error) { console.error('Error deleting photo:', error) }

    const { error: updateError } = await supabase
      .from('album_teachers').update({ photo_url: null }).eq('id', teacherId).eq('album_id', albumId)
    if (updateError) return c.json({ error: updateError.message }, 500)

    return c.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE teacher photo:', error)
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default teacherIdPhoto
