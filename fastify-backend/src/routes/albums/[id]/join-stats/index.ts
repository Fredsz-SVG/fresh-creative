import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    try {
      const { id: albumId } = request.params as any
      const supabase = getSupabaseClient(request)
      
      // Call the stats function
      const { data, error } = await supabase.rpc('get_album_join_stats', {
        _album_id: albumId
      })
  
      if (error) throw error
  
      const stats = data?.[0] || {
        limit_count: null,
        approved_count: 0,
        pending_count: 0,
        rejected_count: 0,
        available_slots: 999999
      }
  
      return reply.send(stats)
    } catch (error) {
      console.error('Error fetching join stats:', error)
      return reply.send({ error: 'Failed to fetch statistics' })
    }
  
  })

}

export default route
