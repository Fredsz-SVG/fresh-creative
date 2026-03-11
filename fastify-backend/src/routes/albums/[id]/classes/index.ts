import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })
  
    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase
  
    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return reply.code(404).send({ error: 'Album not found' })
  
    const { data: classes, error } = await client
      .from('album_classes')
      .select('id, name, sort_order, batch_photo_url')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })
  
    if (error) return reply.code(500).send({ error: error.message })
  
    const classList = (classes ?? []) as { id: string; name: string; sort_order: number; batch_photo_url: string | null }[]
    const { data: allAccess } = await client
      .from('album_class_access')
      .select('class_id, photos')
      .eq('album_id', albumId)
  
    const studentCounts: Record<string, number> = {}
    if (allAccess) {
      for (const r of allAccess) {
        if (Array.isArray(r.photos) && r.photos.length > 0) {
          studentCounts[r.class_id] = (studentCounts[r.class_id] ?? 0) + 1
        }
      }
    }
  
    const withCount = classList.map((c) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      batch_photo_url: c.batch_photo_url,
      student_count: studentCounts[c.id] ?? 0,
    }))
  
    return reply.send(withCount)
  
  })

  server.post('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })
  
    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase
  
    const { data: album, error: albumErr } = await client
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })
    const role = await getRole(supabase, user)
    if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
      return reply.code(403).send({ error: 'Only owner can add class' })
    }
  
    const body = (request.body || {})
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
  
    if (!name) return reply.code(400).send({ error: 'Class name is required' })
  
    const { data: existing } = await client
      .from('album_classes')
      .select('id')
      .eq('album_id', albumId)
      .eq('name', name)
      .maybeSingle()
  
    if (existing) return reply.code(400).send({ error: 'Class with this name already exists' })
  
    const { count } = await client.from('album_classes').select('id', { count: 'exact', head: true }).eq('album_id', albumId)
    const sort_order = (count ?? 0)
  
    const { data: created, error } = await client
      .from('album_classes')
      .insert({ album_id: albumId, name, sort_order })
      .select('id, name, sort_order, album_id, created_at')
      .single()
  
    if (error) {
      const isDuplicate = /duplicate key|unique constraint|album_classes_album_id_name_key/i.test(error.message)
      if (isDuplicate) {
        return reply.code(400).send({ error: 'Kelas dengan nama ini sudah ada di album ini' })
      }
      return reply.code(500).send({ error: error.message })
    }
    return reply.send(created)
  
  })

}

export default route
