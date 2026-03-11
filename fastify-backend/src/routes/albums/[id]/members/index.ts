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
        try {

            const supabaseAdmin = getAdminSupabaseClient()
            const client = supabaseAdmin || supabase

            const [albumRes, globalRole, adminCheck] = await Promise.all([
                client.from('albums').select('user_id').eq('id', albumId).single(),
                getRole(supabase, user),
                client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).eq('role', 'admin').maybeSingle()
            ])
            const album = albumRes.data as { user_id: string } | null
            if (!album) return reply.code(404).send({ error: 'Album not found' })

            const isOwner = album.user_id === user.id
            const isGlobalAdmin = globalRole === 'admin'
            const isAlbumAdmin = !!(adminCheck.data as { role?: string } | null)?.role
            const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

            if (!canManage) return reply.code(403).send({ error: 'Forbidden' })

            const [membersRes, allStudentsRes, ownerRes] = await Promise.all([
                client.from('album_members').select('user_id, role, joined_at').eq('album_id', albumId),
                client.from('album_class_access').select('user_id, student_name, email, status').eq('album_id', albumId).eq('status', 'approved'),
                client.from('users').select('id, email').eq('id', album.user_id).single()
            ])
            const members = membersRes.data
            const allStudents = allStudentsRes.data
            const ownerData = ownerRes.data

            const memberIds = members?.map((m: any) => m.user_id).filter((id: string) => id !== album.user_id) ?? []
            let emailByUserId: Record<string, string> = {}
            if (memberIds.length > 0) {
                const { data: userRows } = await client.from('users').select('id, email').in('id', memberIds)
                if (userRows) userRows.forEach((u: any) => { emailByUserId[u.id] = u.email || 'Unknown' })
            }

            const userMap = new Map()

            if (ownerData) {
                userMap.set(ownerData.id, {
                    user_id: ownerData.id,
                    email: ownerData.email || 'Unknown',
                    role: 'owner',
                    name: null,
                    has_account: true,
                    is_owner: true
                })
            }

            // Add members first (those with roles) - role from DB
            members?.forEach((m: any) => {
                if (m.user_id === album.user_id) return // Skip owner
                const role = (m.role === 'admin' || m.role === 'member') ? m.role : 'member'
                userMap.set(m.user_id, {
                    user_id: m.user_id,
                    email: emailByUserId[m.user_id] || 'Unknown',
                    role,
                    name: null,
                    has_account: true
                })
            })

            // Add ALL students (merge if already exists)
            allStudents?.forEach((s: any) => {
                if (s.user_id === album.user_id) {
                    // Update owner name if found in students
                    const owner = userMap.get(s.user_id)
                    if (owner) {
                        owner.name = s.student_name
                        if (!owner.email || owner.email === 'Unknown') owner.email = s.email
                    }
                    return
                }

                const key = s.user_id || `no-account-${s.student_name}-${s.email}`
                const existing = s.user_id ? userMap.get(s.user_id) : null

                if (existing) {
                    // User already in members: only add name/email, never overwrite role (owner/admin/member from album_members)
                    existing.name = s.student_name
                    if (!existing.email || existing.email === 'Unknown') existing.email = s.email
                } else {
                    // New entry
                    userMap.set(key, {
                        user_id: s.user_id,
                        email: s.email || 'Belum ada email',
                        role: s.user_id ? 'student' : 'no-account',
                        name: s.student_name,
                        has_account: !!s.user_id
                    })
                }
            })

            return reply.send(Array.from(userMap.values()))
        } finally {
        }

    })

    server.post('/', async (request: any, reply: any) => {

        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { id: albumId } = request.params as any
        const body = request.body
        const { user_id, email, role } = body
        const supabaseAdmin = getAdminSupabaseClient()
        const client = supabaseAdmin || supabase

        const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
        const isOwner = album?.user_id === user.id
        const globalRole = await getRole(supabase, user)
        const isGlobalAdmin = globalRole === 'admin'

        if (!isOwner && !isGlobalAdmin) return reply.code(403).send({ error: 'Hanya owner atau admin web yang bisa menambah/promote member' })

        let targetUserId = user_id
        if (!targetUserId && email) {
            const { data: userData } = await client
                .from('users')
                .select('id')
                .eq('email', body.email)
                .single()

            if (!userData) {
                return reply.code(404).send({ error: 'User dengan email tersebut belum terdaftar. Minta mereka untuk login/registrasi terlebih dahulu.' })
            }
            targetUserId = userData.id
        }

        if (!targetUserId) return reply.code(400).send({ error: 'User ID atau Email diperlukan' })

        const roleNorm = (role === 'admin' || role === 'member') ? role : 'member'

        // Upsert member (explicit onConflict so role update persists)
        const { error } = await client
            .from('album_members')
            .upsert(
                {
                    album_id: albumId,
                    user_id: targetUserId,
                    role: roleNorm,
                },
                { onConflict: 'album_id,user_id' }
            )
        if (error) return reply.code(500).send({ error: error.message })

        return reply.send({ success: true })

    })

    server.patch('/', async (request: any, reply: any) => {

        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { id: albumId } = request.params as any
        const searchParams = request.query as any
        const targetUserId = (request.query as any)?.user_id

        if (!targetUserId) {
            return reply.code(400).send({ error: 'User ID required' })
        }

        const body = request.body
        const { role } = body

        if (role !== 'admin' && role !== 'member') {
            return reply.code(400).send({ error: 'Invalid role' })
        }

        const supabaseAdmin = getAdminSupabaseClient()
        const client = supabaseAdmin || supabase

        const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
        const isOwner = album?.user_id === user.id
        const globalRole = await getRole(supabase, user)
        const isGlobalAdmin = globalRole === 'admin'

        if (!isOwner && !isGlobalAdmin) {
            return reply.code(403).send({ error: 'Only owner or global admin can update roles' })
        }

        // Update role in album_members
        const { error } = await client
            .from('album_members')
            .update({ role })
            .eq('album_id', albumId)
            .eq('user_id', targetUserId)

        if (error) {
            return reply.code(500).send({ error: error.message })
        }

        return reply.send({ success: true, role })

    })

    server.delete('/', async (request: any, reply: any) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return reply.code(401).send({ error: 'Unauthorized' })

        const { id: albumId } = request.params as any
        const targetUserId = (request.query as any)?.user_id
        if (!targetUserId) return reply.code(400).send({ error: 'user_id required' })

        const admin = getAdminSupabaseClient()
        if (!admin) return reply.code(500).send({ error: 'Server error' })

        const { data: album } = await admin.from('albums').select('user_id').eq('id', albumId).single()
        if (!album) return reply.code(404).send({ error: 'Album not found' })
        const ownerId = (album as { user_id: string }).user_id
        if (targetUserId === ownerId) return reply.code(400).send({ error: 'Owner album tidak dapat dihapus' })

        const isOwner = ownerId === user.id
        const globalRole = await getRole(supabase, user)
        const isGlobalAdmin = globalRole === 'admin'
        if (!isOwner && !isGlobalAdmin) {
            const { data: member } = await admin.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
            const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
            if (!isAlbumAdmin) return reply.code(403).send({ error: 'Hanya owner atau admin yang dapat menghapus member' })
        }

        const { error } = await admin
            .from('album_members')
            .delete()
            .eq('album_id', albumId)
            .eq('user_id', targetUserId)

        if (error) return reply.code(500).send({ error: error.message })
        return reply.code(200).send({ success: true })
    })

}

export default route
