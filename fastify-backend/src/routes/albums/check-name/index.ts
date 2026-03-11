import { FastifyPluginAsync } from 'fastify'
import { getAdminSupabaseClient } from '../../../lib/supabase'
import { isSimilarSchoolName } from '../../../lib/school-name-utils'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
    const name = (request.query as any)?.name?.trim()

    if (!name) {
      return reply.send({ exists: false })
    }

    const admin = getAdminSupabaseClient()
    if (!admin) {
      return reply.code(500).send({ error: 'Admin client not configured' })
    }

    const { data: albums, error } = await admin
      .from('albums')
      .select('id, name, pic_name, wa_e164')
      .eq('type', 'yearbook')

    if (error) {
      console.error('[check-name] error:', error.message)
      return reply.send({ exists: false })
    }

    if (!albums || albums.length === 0) {
      return reply.send({ exists: false })
    }

    for (const album of albums) {
      if (isSimilarSchoolName(name, album.name || '')) {
        return reply.send({
          exists: true,
          matched_name: album.name,
          pic_name: album.pic_name || null,
          wa_e164: album.wa_e164 || null,
        })
      }
    }

    return reply.send({ exists: false })
  })

}

export default route
