import { FastifyPluginAsync } from 'fastify'
import { getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    try {
      const { id: albumId } = request.params as any
      console.log('[PUBLIC] Fetching album info for:', albumId)
      
      // Use admin client to get public album info without auth
      const supabase = getAdminSupabaseClient()
      if (!supabase) {
        console.error('[PUBLIC] Failed to create admin client')
        return reply.code(500).send({ error: 'Database connection failed' })
      }
  
      console.log('[PUBLIC] Admin client created, querying database...')
      const { data: album, error } = await supabase
        .from('albums')
        .select('id, name, description, students_count')
        .eq('id', albumId)
        .maybeSingle()
  
      if (error) {
        console.error('[PUBLIC] Database error:', error)
        return reply.code(404).send({ error: 'Album tidak ditemukan' })
      }
  
      if (!album) {
        console.log('[PUBLIC] No album found with ID:', albumId)
        return reply.code(404).send({ error: 'Album tidak ditemukan' })
      }
  
      // Fetch album classes so registration form can show them
      const { data: classes } = await supabase
        .from('album_classes')
        .select('id, name, sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true })
  
      console.log('[PUBLIC] Album found:', album.name, '- classes:', classes?.length ?? 0)
      return reply.code(200).send({ ...album, classes: classes || [] })
    } catch (error) {
      console.error('[PUBLIC] Error fetching public album info:', error)
      return reply.code(500).send({ error: 'Failed to fetch album' })
    }
  
  })

}

export default route
