import { FastifyPluginAsync } from 'fastify'
import { getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply) => {
    const { token } = request.params as any
    if (!token) return reply.code(400).send({ error: 'Token required' })

    const admin = getAdminSupabaseClient()
    const { data: album } = await admin
      .from('albums')
      .select('id, name, type, student_invite_expires_at, description, cover_image_url')
      .eq('student_invite_token', token)
      .maybeSingle()

    if (!album) return reply.code(404).send({ error: 'Invite not found or invalid' })

    const expiresAt = album.student_invite_expires_at ? new Date(album.student_invite_expires_at) : null
    if (expiresAt && expiresAt < new Date()) {
      return reply.code(410).send({ error: 'Invite expired' })
    }

    return reply.send({
      inviteType: 'student', albumId: album.id, name: album.name, type: album.type,
      description: album.description, coverImageUrl: album.cover_image_url,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    })
  })
}

export default route
