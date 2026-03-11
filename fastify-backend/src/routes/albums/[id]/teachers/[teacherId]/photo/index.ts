import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply: any) => {
  
    try {
      const supabase = getSupabaseClient(request)
      const { id: albumId, teacherId } = request.params as any
  
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
  
      // Check if user is global admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
  
      const isGlobalAdmin = userData?.role === 'admin'
  
      if (!isGlobalAdmin) {
        // Verify user is album owner or album admin
        const { data: album, error: albumError } = await supabase
          .from('albums')
          .select('user_id')
          .eq('id', albumId)
          .maybeSingle()
  
        if (albumError || !album) {
          return reply.code(404).send({ error: 'Album not found' })
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
            return reply.code(403).send({ error: 'Forbidden' })
          }
        }
      }
  
      // Verify teacher exists
      const { data: teacher, error: teacherError } = await supabase
        .from('album_teachers')
        .select('photo_url')
        .eq('id', teacherId)
        .eq('album_id', albumId)
        .maybeSingle()
  
      if (teacherError || !teacher) {
        return reply.code(404).send({ error: 'Teacher not found' })
      }
  
      // Get file from form data
      const formData = request.body
      const file = formData.get('file') as File
  
      if (!file) {
        return reply.code(400).send({ error: 'No file provided' })
      }
  
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return reply.code(400).send({ error: 'File must be an image' })
      }
  
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return reply.code(413).send({ error: 'Foto maksimal 10MB' })
      }
  
      // Delete old photo if exists
      if (teacher.photo_url) {
        try {
          const urlParts = teacher.photo_url.split('/')
          const oldFileName = urlParts[urlParts.length - 1]
          const bucket = 'album-photos'
          
          await supabase.storage
            .from(bucket)
            .remove([`teachers/${teacherId}/${oldFileName}`])
        } catch (error) {
          console.error('Error deleting old photo:', error)
          // Continue with upload even if old photo deletion fails
        }
      }
  
      // Upload new photo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `teachers/${teacherId}/${fileName}`
      const bucket = 'album-photos'
  
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
  
      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        return reply.code(500).send({ error: uploadError.message })
      }
  
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)
  
      // Update teacher with new photo URL
      const { data: updatedTeachers, error: updateError } = await supabase
        .from('album_teachers')
        .update({ photo_url: publicUrl })
        .eq('id', teacherId)
        .eq('album_id', albumId)
        .select()
  
      if (updateError) {
        console.error('Error updating teacher photo URL:', updateError)
        // Try to delete uploaded file
        await supabase.storage.from(bucket).remove([filePath])
        return reply.code(500).send({ error: updateError.message })
      }
  
      if (!updatedTeachers || updatedTeachers.length === 0) {
        console.error('Teacher not found after photo upload')
        await supabase.storage.from(bucket).remove([filePath])
        return reply.code(404).send({ error: 'Teacher not found' })
      }
  
      return reply.code(500).send(updatedTeachers[0])
    } catch (error: any) {
      console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/photo:', error)
      return reply.send({ error: error.message || 'Internal server error' })
    }
  
  })

  server.delete('/', async (request: any, reply: any) => {
  
    try {
      const supabase = getSupabaseClient(request)
      const { id: albumId, teacherId } = request.params as any
  
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
  
      // Check if user is global admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
  
      const isGlobalAdmin = userData?.role === 'admin'
  
      if (!isGlobalAdmin) {
        // Verify user is album owner or album admin
        const { data: album, error: albumError } = await supabase
          .from('albums')
          .select('user_id')
          .eq('id', albumId)
          .maybeSingle()
  
        if (albumError || !album) {
          return reply.code(404).send({ error: 'Album not found' })
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
            return reply.code(403).send({ error: 'Forbidden' })
          }
        }
      }
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('user_id')
        .eq('id', albumId)
        .maybeSingle()
  
      if (albumError || !album) {
        return reply.code(404).send({ error: 'Album not found' })
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
          return reply.code(403).send({ error: 'Forbidden' })
        }
      }
  
      // Get teacher info
      const { data: teacher, error: teacherError } = await supabase
        .from('album_teachers')
        .select('photo_url')
        .eq('id', teacherId)
        .eq('album_id', albumId)
        .maybeSingle()
  
      if (teacherError || !teacher) {
        return reply.code(404).send({ error: 'Teacher not found' })
      }
  
      if (!teacher.photo_url) {
        return reply.code(400).send({ error: 'No photo to delete' })
      }
  
      // Delete photo from storage
      try {
        const urlParts = teacher.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const bucket = 'album-photos'
        
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .remove([`teachers/${teacherId}/${fileName}`])
  
        if (storageError) {
          console.error('Error deleting photo from storage:', storageError)
          // Continue with database update even if storage deletion fails
        }
      } catch (error) {
        console.error('Error deleting photo:', error)
      }
  
      // Update teacher to remove photo URL
      const { error: updateError } = await supabase
        .from('album_teachers')
        .update({ photo_url: null })
        .eq('id', teacherId)
        .eq('album_id', albumId)
  
      if (updateError) {
        console.error('Error updating teacher:', updateError)
        return reply.code(500).send({ error: updateError.message })
      }
  
      return reply.code(500).send({ success: true })
    } catch (error: any) {
      console.error('Error in DELETE /api/albums/[id]/teachers/[teacherId]/photo:', error)
      return reply.send({ error: error.message || 'Internal server error' })
    }
  
  })

}

export default route
