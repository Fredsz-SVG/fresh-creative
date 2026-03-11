import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    // GET /api/admin/transactions
    server.get('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return reply.code(401).send({ error: 'Unauthorized' })

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        if (profile?.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })

        const scope = (request.query as any)?.scope
        const adminClient = getAdminSupabaseClient()

        const selectWithDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
        const selectWithoutDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)'

        if (scope !== 'all') {
            // Own transactions
            let data: any[] | null = null; let error: any = null
            const selectWithDescUser = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
            const res1 = await adminClient.from('transactions').select(selectWithDescUser).eq('user_id', user.id).order('created_at', { ascending: false })
            if (res1.error) {
                const res2 = await adminClient.from('transactions').select(selectWithoutDesc).eq('user_id', user.id).order('created_at', { ascending: false })
                data = res2.data; error = res2.error
            } else { data = res1.data }
            if (error) return reply.code(500).send({ error: error.message })

            const list = (data || []).map((row: any) => {
                const { credit_packages, albums, ...rest } = row
                const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
                const album = Array.isArray(albums) ? albums[0] : albums
                return { ...rest, credits: pkg?.credits ?? null, album_name: album?.name ?? null }
            })
            return reply.send(list)
        }

        // All transactions (scope=all)
        const selectAllWithDesc = 'id, user_id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
        const selectAllWithoutDesc = 'id, user_id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)'

        let rows: any[] | null = null; let rowsError: any = null
        const r1 = await adminClient.from('transactions').select(selectAllWithDesc).order('created_at', { ascending: false })
        if (r1.error) {
            const r2 = await adminClient.from('transactions').select(selectAllWithoutDesc).order('created_at', { ascending: false })
            rows = r2.data; rowsError = r2.error
        } else { rows = r1.data }
        if (rowsError) return reply.code(500).send({ error: rowsError.message })

        const list = rows || []
        if (list.length === 0) return reply.send([])

        const userIds = [...new Set(list.map((r: any) => r.user_id))]
        const { data: users } = await adminClient.from('users').select('id, full_name, email').in('id', userIds)
        const userMap = new Map((users || []).map((u: any) => [u.id, { full_name: u.full_name || '-', email: u.email || '-' }]))

        return reply.send(list.map((tx: any) => {
            const u: any = userMap.get(tx.user_id) || { full_name: '-', email: '-' }
            const { credit_packages, albums, ...rest } = tx
            const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
            const album = Array.isArray(albums) ? albums[0] : albums
            return { ...rest, credits: pkg?.credits ?? null, album_name: album?.name ?? null, user_full_name: u.full_name, user_email: u.email }
        }))
    })
}

export default route
