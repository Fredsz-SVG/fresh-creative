import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    // GET /api/user/me
    server.get('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return reply.code(401).send({ error: 'Not authenticated' })
        }

        const { data, error } = await supabase
            .from('users')
            .select('credits, is_suspended')
            .eq('id', user.id)
            .maybeSingle()

        if (error || !data) {
            return reply.send({ id: user.id, credits: 0, isSuspended: false })
        }

        return reply.send({
            id: user.id,
            credits: data?.credits ?? 0,
            isSuspended: data?.is_suspended ?? false,
        })
    })
}

export default route
