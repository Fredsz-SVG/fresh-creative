import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    try {
      const { id: albumId } = request.params as any
      const supabase = getSupabaseClient(request)
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user) {
        return reply.code(500).send({ hasRequest: false })
      }
  
      // Use admin client to check if user has a request
      const adminClient = getAdminSupabaseClient()
      if (!adminClient) {
        return reply.send({ error: 'Database connection failed' })
      }
  
      // Check album_join_requests for pending/rejected requests
      const { data: existing } = await adminClient
        .from('album_join_requests')
        .select('id, status')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()
  
      // If approved, verify they still have active access in album_class_access or album_members
      if (existing && existing.status === 'approved') {
        // Check if user still has active access
        const { data: classAccess } = await adminClient
          .from('album_class_access')
          .select('id')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle()
  
        const { data: memberAccess } = await adminClient
          .from('album_members')
          .select('id')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .maybeSingle()
  
        // If they have active access, return approved status
        if (classAccess || memberAccess) {
          return reply.code(500).send({
            hasRequest: true,
            status: 'approved'
          })
        }
  
        // Approved but no longer has access - allow re-registration
        return reply.send({ hasRequest: false })
      }
  
      // Return pending/rejected status as-is
      if (existing) {
        return reply.send({
          hasRequest: true,
          status: existing.status
        })
      }
  
      return reply.send({ hasRequest: false })
    } catch (error) {
      console.error('Error checking user request:', error)
      return reply.send({ error: 'Internal server error' })
    }
  
  })

}

export default route
