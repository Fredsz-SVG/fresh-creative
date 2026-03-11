import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
    server.get('/', async (request: any, reply: any) => {
        try {
            const supabase = getSupabaseClient(request)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return reply.send({ access: {}, requests: {} })
            }

            const { id: albumId } = request.params as any
            if (!albumId) {
                return reply.code(400).send({ error: 'Album ID required' })
            }

            const [accessRes, requestsRes] = await Promise.all([
                supabase
                    .from('album_class_access')
                    .select('id, class_id, album_id, user_id, student_name, email, status, date_of_birth, instagram, message, video_url, photos, created_at')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id),

                supabase
                    .from('album_join_requests')
                    .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id)
            ])

            if (accessRes.error) throw accessRes.error
            if (requestsRes.error) throw requestsRes.error

            const accessByClass: Record<string, any> = {}
            accessRes.data?.forEach((item: any) => {
                if (item.class_id) accessByClass[item.class_id] = item
            })

            const requestsByClassMap: Record<string, any> = {}
            requestsRes.data?.forEach((item: any) => {
                if (item.assigned_class_id) requestsByClassMap[item.assigned_class_id] = item
            })

            return reply.send({ access: accessByClass, requests: requestsByClassMap })
        } catch (err: any) {
            console.error('Error in my-access-all:', err)
            return reply.code(500).send({ error: err.message || 'Internal Server Error' })
        }
    })
}

export default route
