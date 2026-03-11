import { FastifyPluginAsync } from 'fastify'
import { getAdminSupabaseClient } from '../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    // GET /api/pricing
    server.get('/', async (request, reply) => {
        const supabase = getAdminSupabaseClient()
        const { data, error } = await supabase.from('pricing_packages').select('*')
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send(data)
    })

    // POST /api/pricing
    server.post('/', async (request: any, reply) => {
        const supabase = getAdminSupabaseClient()
        const { name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = request.body || {}
        const { data, error } = await supabase
            .from('pricing_packages')
            .insert([{ name, price_per_student: Number(price_per_student), min_students: Number(min_students), features, flipbook_enabled: !!flipbook_enabled, ai_labs_features: ai_labs_features ?? [], is_popular: !!is_popular }])
            .select()
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send(data)
    })

    // PUT /api/pricing
    server.put('/', async (request: any, reply) => {
        const supabase = getAdminSupabaseClient()
        const { id, name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = request.body || {}
        if (!id) return reply.code(400).send({ error: 'Package ID is required' })
        const { data, error } = await supabase
            .from('pricing_packages')
            .update({ name, price_per_student: Number(price_per_student), min_students: Number(min_students), features, flipbook_enabled: !!flipbook_enabled, ai_labs_features: ai_labs_features ?? [], is_popular: !!is_popular })
            .eq('id', id).select()
        if (error) return reply.code(500).send({ error: error.message })
        if (!data || data.length === 0) return reply.code(404).send({ error: 'Package not found' })
        return reply.send(data)
    })

    // DELETE /api/pricing
    server.delete('/', async (request: any, reply) => {
        const supabase = getAdminSupabaseClient()
        const { id } = request.body || {}
        if (!id) return reply.code(400).send({ error: 'Package ID is required' })
        const { error } = await supabase.from('pricing_packages').delete().eq('id', id)
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send({ message: 'Package deleted successfully' })
    })
}

export default route
