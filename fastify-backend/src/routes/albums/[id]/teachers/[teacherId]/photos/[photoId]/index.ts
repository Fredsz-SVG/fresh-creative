import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.delete('/', async (request: any, reply: any) => {
  
    try {
      const supabase = getSupabaseClient(request)
      const { id: albumId, teacherId, photoId } = request.params as any
  
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return reply.code(401).send({ error: 'Unauthorized' })
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
  
      // Get photo info
      const { data: photo } = await supabase
        .from('album_teacher_photos')
        .select('file_url')
        .eq('id', photoId)
        .eq('teacher_id', teacherId)
        .maybeSingle()
  
      if (!photo) {
        return reply.code(404).send({ error: 'Photo not found' })
      }
  
      // Delete from storage
      try {
        const urlParts = photo.file_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = `teachers/${teacherId}/${fileName}`
  
        await supabase.storage
          .from('album-photos')
          .remove([filePath])
      } catch (error) {
        console.error('Error deleting from storage:', error)
        // Continue with DB deletion even if storage fails
      }
  
      // Delete from database
      const { error: deleteError } = await supabase
        .from('album_teacher_photos')
        .delete()
        .eq('id', photoId)
  
      if (deleteError) {
        console.error('Error deleting photo record:', deleteError)
        return reply.code(500).send({ error: deleteError.message })
      }
  
      return reply.code(500).send({ success: true })
    } catch (error: any) {
      console.error('Error in DELETE photo:', error)
      return reply.send({ error: error.message || 'Internal server error' })
    }
  
  })

}

export default route
