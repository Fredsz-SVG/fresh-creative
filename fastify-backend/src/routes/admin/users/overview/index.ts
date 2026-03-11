import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    // Helper: verify admin
    async function verifyAdmin(request: any, reply: any) {
        const supabase = getSupabaseClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { reply.code(401).send({ error: 'Unauthorized' }); return null }
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        if (profile?.role !== 'admin') { reply.code(403).send({ error: 'Forbidden' }); return null }
        return { user, adminClient: getAdminSupabaseClient() }
    }

    // GET /api/admin/users/overview
    server.get('/', async (request: any, reply) => {
        const ctx = await verifyAdmin(request, reply)
        if (!ctx) return
        const { adminClient } = ctx

        const search = ((request.query as any)?.search ?? '').trim()
        const pageParam = parseInt((request.query as any)?.page ?? '1', 10)
        const perPageParam = parseInt((request.query as any)?.perPage ?? '10', 10)
        const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
        const perPage = Number.isNaN(perPageParam) || perPageParam < 1 ? 10 : perPageParam

        try {
            // Sync auth users to users table
            const authUsers = await adminClient.auth.admin.listUsers({ perPage: 1000 })
            if (!authUsers.error && authUsers.data?.users?.length) {
                const rows = authUsers.data.users.map((u: any) => ({
                    id: u.id, email: u.email,
                    full_name: (u.user_metadata?.full_name as string) ?? null,
                }))
                await adminClient.from('users').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
            }

            const { count: totalUsers } = await adminClient.from('users').select('*', { count: 'exact', head: true })
            const { count: totalAdmins } = await adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
            const since = new Date(); since.setDate(since.getDate() - 7)
            const { count: newUsers7d } = await adminClient.from('users').select('*', { count: 'exact', head: true }).gte('created_at', since.toISOString())
            const { data: creditRows } = await adminClient.from('users').select('credits')
            const totalCredits = (creditRows ?? []).reduce((sum: number, row: any) => sum + (typeof row.credits === 'number' ? row.credits : 0), 0)

            let listQuery = adminClient.from('users').select('id, email, full_name, role, credits, created_at, is_suspended', { count: 'exact' })
            if (search) listQuery = listQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)

            const from = (page - 1) * perPage
            const { data: latestUsers, error: latestError, count } = await listQuery.order('created_at', { ascending: false }).range(from, from + perPage - 1)
            if (latestError) return reply.code(500).send({ error: latestError.message })

            return reply.send({ totalUsers: totalUsers ?? 0, totalAdmins: totalAdmins ?? 0, totalCredits, newUsers7d: newUsers7d ?? 0, latestUsers: latestUsers ?? [], page, perPage, total: count ?? 0 })
        } catch (e: any) {
            return reply.code(500).send({ error: e?.message || 'Failed to load overview' })
        }
    })

    // PUT /api/admin/users/overview - update user
    server.put('/', async (request: any, reply) => {
        const ctx = await verifyAdmin(request, reply)
        if (!ctx) return
        const { adminClient } = ctx

        const body = request.body || {}
        const { id, credits, role, isSuspended } = body as any
        if (!id) return reply.code(400).send({ error: 'Invalid payload' })

        const update: Record<string, any> = {}
        if (typeof credits === 'number') {
            if (credits < 0) return reply.code(400).send({ error: 'Credits must be >= 0' })
            update.credits = credits
        }
        if (role === 'admin' || role === 'user') update.role = role
        else if (role !== undefined) return reply.code(400).send({ error: 'Invalid role' })
        if (typeof isSuspended === 'boolean') update.is_suspended = isSuspended
        if (Object.keys(update).length === 0) return reply.code(400).send({ error: 'No fields to update' })

        const { data, error } = await adminClient.from('users').update(update).eq('id', id).select('id, email, full_name, role, credits, created_at').maybeSingle()
        if (error) return reply.code(500).send({ error: error.message })
        if (!data) return reply.code(404).send({ error: 'User not found' })
        return reply.send(data)
    })

    // DELETE /api/admin/users/overview - delete user
    server.delete('/', async (request: any, reply) => {
        const ctx = await verifyAdmin(request, reply)
        if (!ctx) return
        const { adminClient } = ctx

        const { id } = (request.body || {}) as any
        if (!id) return reply.code(400).send({ error: 'Invalid payload' })
        const { error } = await adminClient.auth.admin.deleteUser(id)
        if (error) return reply.code(500).send({ error: error.message })
        return reply.send({ success: true })
    })
}

export default route
