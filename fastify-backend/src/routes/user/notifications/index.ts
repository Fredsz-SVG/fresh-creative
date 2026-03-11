import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    // GET - List all notifications
    server.get('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { data, error } = await supabase
            .from('notifications').select('*')
            .eq('user_id', user.id).order('created_at', { ascending: false })
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send(data)
    })

    // POST - Create notification
    server.post('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { title, message, type, action_url, metadata } = request.body || {}
        const { data, error } = await supabase
            .from('notifications')
            .insert({ user_id: user.id, title, message, type: type || 'info', action_url, metadata })
            .select().single()
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send(data)
    })

    // PATCH - Mark all as read
    server.patch('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send({ success: true })
    })

    // DELETE - Clear all
    server.delete('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send({ success: true })
    })
}

export default route
