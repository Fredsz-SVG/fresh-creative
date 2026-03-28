import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const teacherVideo = new Hono()

teacherVideo.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    // Parse multipart form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
    if (file.size > MAX_VIDEO_BYTES) {
      return c.json({ error: 'Video maksimal 20MB' }, 413)
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check permissions
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

    // Verify teacher exists
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('id, video_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (!teacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }

    const admin = getAdminSupabaseClient(c?.env as any)
    if (!admin) return c.json({ error: 'Server configuration error' }, 500)

    // Delete old video if exists
    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await admin.storage
          .from('album-photos')
          .remove([`teachers/${teacherId}/videos/${fileName}`])
      } catch (error) {
        console.error('Error deleting old video:', error)
      }
    }

    // Upload new video to storage
    const filename = file.name || 'video.mp4'
    const mimetype = file.type || 'video/mp4'
    const fileExt = filename.split('.').pop() || 'mp4'
    const newFileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/videos/${newFileName}`

    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await admin.storage
      .from('album-photos')
      .upload(filePath, fileBuffer, { contentType: mimetype, upsert: true })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return c.json({ error: uploadError.message }, 500)
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('album-photos')
      .getPublicUrl(filePath)

    // Update teacher with new video URL
    const { data: updatedTeachers, error: updateError } = await admin
      .from('album_teachers')
      .update({ video_url: publicUrl })
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .select()

    if (updateError) {
      console.error('DB update error:', updateError)
      return c.json({ error: updateError.message }, 500)
    }

    if (!updatedTeachers || updatedTeachers.length === 0) {
      return c.json({ error: 'Failed to update teacher' }, 500)
    }

    return c.json({ video_url: publicUrl })
  } catch (error: any) {
    console.error('Error in POST teacher video:', error)
    return c.json({ error: error.message || 'Internal server error' })
  }
})

teacherVideo.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check permissions
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

    // Get teacher info
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('video_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (!teacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }

    // Delete video from storage
    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await supabase.storage
          .from('album-photos')
          .remove([`teachers/${teacherId}/videos/${fileName}`])
      } catch (error) {
        console.error('Error deleting video from storage:', error)
      }
    }

    // Update teacher to remove video URL
    const { error: updateError } = await supabase
      .from('album_teachers')
      .update({ video_url: null })
      .eq('id', teacherId)
      .eq('album_id', albumId)

    if (updateError) {
      console.error('Error updating teacher:', updateError)
      return c.json({ error: updateError.message }, 500)
    }

    return c.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE video:', error)
    return c.json({ error: error.message || 'Internal server error' })
  }
})

export default teacherVideo
