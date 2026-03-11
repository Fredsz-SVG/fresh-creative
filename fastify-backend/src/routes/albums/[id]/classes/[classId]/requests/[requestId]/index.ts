import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../../../lib/supabase'
import { getRole } from '../../../../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.patch('/', async (request: any, reply) => {
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id: albumId, classId, requestId } = request.params as any
    if (!albumId || !classId || !requestId) return reply.code(400).send({ error: 'IDs required' })

    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase

    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return reply.code(404).send({ error: 'Album not found' })

    const isOwner = (album as any).user_id === user.id
    const globalRole = await getRole(supabase, user)
    if (!isOwner && globalRole !== 'admin') {
      const { data: member } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
      if ((member as any)?.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })
    }

    const body = request.body || {}
    const status = body?.status === 'approved' ? 'approved' : body?.status === 'rejected' ? 'rejected' : null
    if (!status) return reply.code(400).send({ error: 'status must be approved or rejected' })

    const { data: row, error: fetchErr } = await client
      .from('album_join_requests')
      .select('id, assigned_class_id, user_id, student_name, email, album_id')
      .eq('id', requestId).eq('assigned_class_id', classId).single()

    if (fetchErr || !row) return reply.code(404).send({ error: 'Request not found' })

    if (status === 'approved') {
      const r = row as any
      const { data: created, error: insertErr } = await client
        .from('album_class_access')
        .insert({ album_id: r.album_id, class_id: r.assigned_class_id, user_id: r.user_id, student_name: r.student_name, email: r.email || null, status: 'approved' })
        .select().single()
      if (insertErr) return reply.code(500).send({ error: insertErr.message })

      await client.from('album_members').upsert({ album_id: r.album_id, user_id: r.user_id, role: 'member' }, { onConflict: 'album_id,user_id' })
      await client.from('album_join_requests').delete().eq('id', requestId)
      return reply.send(created)
    } else {
      const { data: updated, error } = await client
        .from('album_join_requests').update({ status: 'rejected' }).eq('id', requestId).select().single()
      if (error) return reply.code(500).send({ error: error.message })
      return reply.send(updated)
    }
  })
}

export default route
