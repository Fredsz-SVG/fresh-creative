import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'

const albumsIdTeachers = new Hono()

// GET /api/albums/:id/teachers
albumsIdTeachers.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const supabase = getSupabaseClient(c)
    const { data: teachers, error } = await supabase
      .from('album_teachers')
      .select('id, album_id, name, title, message, photo_url, video_url, sort_order, created_at')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return c.json({ error: error.message }, 500)
    if (teachers && teachers.length > 0) {
      const teacherIds = teachers.map((t: any) => t.id)
      const { data: photos } = await supabase
        .from('album_teacher_photos')
        .select('id, teacher_id, file_url, sort_order')
        .in('teacher_id', teacherIds)
        .order('sort_order', { ascending: true })
      const photosByTeacher: Record<string, any[]> = {}
      if (photos) {
        photos.forEach((photo: any) => {
          if (!photosByTeacher[photo.teacher_id]) {
            photosByTeacher[photo.teacher_id] = []
          }
          photosByTeacher[photo.teacher_id].push(photo)
        })
      }
      teachers.forEach((teacher: any) => {
        teacher.photos = photosByTeacher[teacher.id] || []
      })
    }
    return c.json(teachers || [])
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

// POST /api/albums/:id/teachers
albumsIdTeachers.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const body = await c.req.json()
    const { name, title } = body
    if (!name || !name.trim()) {
      return c.json({ error: 'Nama guru harus diisi' }, 400)
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const isGlobalAdmin = userData?.role === 'admin'
    if (!isGlobalAdmin) {
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('user_id')
        .eq('id', albumId)
        .maybeSingle()
      if (albumError || !album) {
        return c.json({ error: 'Album not found' }, 404)
      }
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members')
          .select('role')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (!member || !['admin', 'owner'].includes(member.role)) {
          return c.json({ error: 'Forbidden' }, 403)
        }
      }
    }
    const { data: lastTeacher } = await supabase
      .from('album_teachers')
      .select('sort_order')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextSortOrder = (lastTeacher?.sort_order ?? -1) + 1
    const { data: newTeachers, error: insertError } = await supabase
      .from('album_teachers')
      .insert({
        album_id: albumId,
        name: name.trim(),
        title: title?.trim() || null,
        sort_order: nextSortOrder,
        created_by: user.id
      })
      .select()
    if (insertError) return c.json({ error: insertError.message }, 500)
    if (!newTeachers || newTeachers.length === 0) {
      return c.json({ error: 'Failed to create teacher' }, 500)
    }
    return c.json(newTeachers[0], 201)
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default albumsIdTeachers
