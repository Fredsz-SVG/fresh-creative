import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
    server.get('/', async (request: any, reply: any) => {
        const { id: albumId } = request.params as any
        try {
            const supabase = getSupabaseClient(request)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return reply.code(401).send({ error: 'Unauthorized' })

            const admin = getAdminSupabaseClient()
            const client = admin || supabase

            const [albumRes, roleRes, memberRes, studentRes] = await Promise.all([
                client.from('albums').select('user_id').eq('id', albumId).single(),
                getRole(supabase, user).then((r: any) => r).catch(() => 'user'),
                client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle(),
                client.from('album_class_access').select('id').eq('album_id', albumId).eq('user_id', user.id).eq('status', 'approved').maybeSingle()
            ])
            const album = albumRes.data as { user_id: string } | null
            if (!album) return reply.code(404).send({ error: 'Album not found' })

            const isGlobalAdmin = roleRes === 'admin'
            const isOwner = album.user_id === user.id || isGlobalAdmin
            const isAlbumAdmin = (memberRes.data as any)?.role === 'admin'
            if (!isOwner && !memberRes.data && !studentRes.data) {
                return reply.code(403).send({ error: 'Forbidden' })
            }
            const canSeePending = isOwner || isAlbumAdmin

            const { data, error } = await client
                .from('album_class_access')
                .select('class_id, user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
                .eq('album_id', albumId)
                .in('status', ['approved', 'pending'])
                .order('student_name', { ascending: true })

            if (error) throw error
            const allMembers = data || []

            const result = allMembers
                .filter((r: any) => canSeePending || r.status === 'approved')
                .map((r: any) => ({
                    class_id: r.class_id, user_id: r.user_id, student_name: r.student_name,
                    email: r.email, date_of_birth: r.date_of_birth, instagram: r.instagram,
                    message: r.message, video_url: r.video_url, photos: r.photos || [],
                    status: r.status, is_me: r.user_id === user.id,
                }))

            return reply.send(result)
        } catch (err: any) {
            console.error('Error fetching all class members:', err)
            return reply.code(500).send({ error: err.message })
        }
    })
}

export default route