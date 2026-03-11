import { FastifyPluginAsync } from 'fastify'
import { getAdminSupabaseClient } from '../../lib/supabase'

const SHOWCASE_KEY = 'showcase'

const defaultShowcase = {
  albumPreviews: [] as { title: string; imageUrl: string; link: string }[],
  flipbookPreviewUrl: '',
}

const route: FastifyPluginAsync = async (server) => {
  // GET /api/showcase — public, no auth
  server.get('/', async (_request, reply) => {
    try {
      const admin = getAdminSupabaseClient()
      const { data, error } = await admin
        .from('site_settings')
        .select('value')
        .eq('key', SHOWCASE_KEY)
        .maybeSingle()
      if (error) {
        server.log.warn(error, 'showcase get')
        return reply.send(defaultShowcase)
      }
      const raw = data?.value
      if (!raw || typeof raw !== 'object') return reply.send(defaultShowcase)
      const albumPreviews = Array.isArray((raw as any).albumPreviews) ? (raw as any).albumPreviews : defaultShowcase.albumPreviews
      const flipbookPreviewUrl = typeof (raw as any).flipbookPreviewUrl === 'string' ? (raw as any).flipbookPreviewUrl : defaultShowcase.flipbookPreviewUrl

      // Automatically inject the actual album cover image if imageUrl is missing or for all of them
      const enrichedPreviews = await Promise.all(
        albumPreviews.map(async (preview: any) => {
          if (!preview.link) return preview
          const match = preview.link.match(/(?:album|yearbook)\/([^/?]+)/)
          if (match && match[1]) {
            const { data: albumData } = await admin
              .from('albums')
              .select('cover_image_url')
              .eq('id', match[1])
              .maybeSingle()
            if (albumData?.cover_image_url) {
              return { ...preview, imageUrl: albumData.cover_image_url }
            }
          }
          return preview
        })
      )

      return reply.send({ albumPreviews: enrichedPreviews, flipbookPreviewUrl })
    } catch {
      return reply.send(defaultShowcase)
    }
  })
}

export default route
