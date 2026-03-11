import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const SHOWCASE_KEY = 'showcase'

const defaultShowcase = {
  albumPreviews: [] as { title: string; imageUrl: string; link: string }[],
  flipbookPreviewUrl: '',
}

const route: FastifyPluginAsync = async (server) => {
  const getShowcase = async () => {
    const admin = getAdminSupabaseClient()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', SHOWCASE_KEY)
      .maybeSingle()
    if (error || !data?.value) return defaultShowcase
    const raw = data.value as any
    return {
      albumPreviews: Array.isArray(raw.albumPreviews) ? raw.albumPreviews : defaultShowcase.albumPreviews,
      flipbookPreviewUrl: typeof raw.flipbookPreviewUrl === 'string' ? raw.flipbookPreviewUrl : defaultShowcase.flipbookPreviewUrl,
    }
  }

  // GET /api/admin/showcase
  server.get('/', async (request: any, reply) => {
    const supabase = getSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return reply.code(401).send({ error: 'Unauthorized' })
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })
    try {
      const payload = await getShowcase()
      return reply.send(payload)
    } catch (e) {
      return reply.code(500).send({ error: 'Failed to load showcase' })
    }
  })

  // PUT /api/admin/showcase
  server.put('/', async (request: any, reply) => {
    const supabase = getSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return reply.code(401).send({ error: 'Unauthorized' })
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })

    const body = request.body as any
    const albumPreviews = Array.isArray(body?.albumPreviews)
      ? body.albumPreviews
          .filter((x: any) => x && typeof x.title === 'string' && typeof x.link === 'string')
          .map((x: any) => ({ title: x.title, imageUrl: typeof x.imageUrl === 'string' ? x.imageUrl : '', link: x.link }))
      : []
    const flipbookPreviewUrl = typeof body?.flipbookPreviewUrl === 'string' ? body.flipbookPreviewUrl : ''

    const admin = getAdminSupabaseClient()
    const { error } = await admin
      .from('site_settings')
      .upsert({ key: SHOWCASE_KEY, value: { albumPreviews, flipbookPreviewUrl } }, { onConflict: 'key' })
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send({ albumPreviews, flipbookPreviewUrl })
  })
}

export default route
