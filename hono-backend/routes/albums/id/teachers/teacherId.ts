import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'

const albumsIdTeachersTeacherId = new Hono()

// PATCH /api/albums/:id/teachers/:teacherId
albumsIdTeachersTeacherId.patch('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
    const body = await c.req.json()
    const { name, title, message, video_url } = body
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
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (title !== undefined) updateData.title = title?.trim() || null
    if (message !== undefined) updateData.message = message?.trim() || null
    if (video_url !== undefined) updateData.video_url = video_url?.trim() || null
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }
    const { data: existingTeacher } = await supabase
      .from('album_teachers')
      .select('*')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()
    if (!existingTeacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }
    const { data: updatedTeachers, error: updateError } = await supabase
      .from('album_teachers')
      .update(updateData)
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .select()
    if (updateError) return c.json({ error: updateError.message }, 500)
    if (!updatedTeachers || updatedTeachers.length === 0) {
      return c.json({ error: 'Teacher not found' }, 404)
    }
    return c.json(updatedTeachers[0], 200)
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/teachers/:teacherId
albumsIdTeachersTeacherId.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
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
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('photo_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()
    if (teacher?.photo_url) {
      try {
        const urlParts = teacher.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const bucket = 'album-photos'
        await supabase.storage
          .from(bucket)
          .remove([`teachers/${teacherId}/${fileName}`])
      } catch (error) {
        // Continue with teacher deletion even if photo deletion fails
      }
    }
    const { error: deleteError } = await supabase
      .from('album_teachers')
      .delete()
      .eq('id', teacherId)
      .eq('album_id', albumId)
    if (deleteError) return c.json({ error: deleteError.message }, 500)
    return c.json({ success: true }, 200)
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default albumsIdTeachersTeacherId
