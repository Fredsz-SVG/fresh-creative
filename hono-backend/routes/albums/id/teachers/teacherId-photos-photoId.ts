import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'

const albumsIdTeachersTeacherIdPhotosPhotoId = new Hono()

// DELETE /api/albums/:id/teachers/:teacherId/photos/:photoId
albumsIdTeachersTeacherIdPhotosPhotoId.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
    const photoId = c.req.param('photoId')
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
      const { data: album } = await supabase
        .from('albums')
        .select('user_id')
        .eq('id', albumId)
        .maybeSingle()
      if (!album) {
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
    const { data: photo } = await supabase
      .from('album_teacher_photos')
      .select('file_url')
      .eq('id', photoId)
      .eq('teacher_id', teacherId)
      .maybeSingle()
    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404)
    }
    try {
      const urlParts = photo.file_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `teachers/${teacherId}/${fileName}`
      await supabase.storage
        .from('album-photos')
        .remove([filePath])
    } catch (error) {
      // Continue with DB deletion even if storage fails
    }
    const { error: deleteError } = await supabase
      .from('album_teacher_photos')
      .delete()
      .eq('id', photoId)
    if (deleteError) return c.json({ error: deleteError.message }, 500)
    return c.json({ success: true }, 200)
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export default albumsIdTeachersTeacherIdPhotosPhotoId