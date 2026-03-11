import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../../lib/supabase'
import { getRole } from '../../../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId, classId } = request.params as any
    if (!albumId || !classId) return reply.code(400).send({ error: 'Album ID and class ID required' })
  
    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase
  
    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return reply.code(404).send({ error: 'Album not found' })
    const albumRow = album as { user_id: string }
    const isOwner = albumRow.user_id === user.id
    const globalRole = await getRole(supabase, user)
    if (!isOwner && globalRole !== 'admin') {
      const { data: member } = await client
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()
      const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
      if (!isAlbumAdmin) {
        return reply.code(403).send({ error: 'Only owner or album admin can list requests' })
      }
    }
  
    const { data: cls } = await client.from('album_classes').select('id').eq('id', classId).eq('album_id', albumId).single()
    if (!cls) return reply.code(404).send({ error: 'Class not found' })
  
    const searchParams = request.query as any
    const statusFilter = (request.query as any)?.status ?? 'pending'
  
    // Pending requests berasal dari album_join_requests
    if (statusFilter === 'pending') {
      try {
        const { data: list, error } = await client
          .from('album_join_requests')
          .select('id, user_id, student_name, email, status, requested_at')
          .eq('assigned_class_id', classId)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
  
        if (error) {
          console.error('Error fetching pending requests:', error.message, error.code)
          return reply.code(500).send({ 
            error: 'Failed to fetch pending requests',
            details: error.message,
            code: error.code 
          })
        }
        return reply.code(500).send(list ?? [])
      } catch (err) {
        console.error('Exception fetching pending requests:', err)
        return reply.send({ error: 'Server error fetching requests' })
      }
    }
  
    // Approved/rejected requests berasal dari album_class_access
    try {
      let query = client
        .from('album_class_access')
        .select('id, user_id, student_name, email, status, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
  
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
  
      const { data: list, error } = await query
  
      if (error) {
        console.error('Error fetching access requests:', error.message, error.code)
        return reply.code(500).send({ 
          error: 'Failed to fetch access requests',
          details: error.message,
          code: error.code 
        })
      }
      return reply.code(500).send(list ?? [])
    } catch (err) {
      console.error('Exception fetching access requests:', err)
      return reply.send({ error: 'Server error fetching requests' })
    }
  
  })

}

export default route
