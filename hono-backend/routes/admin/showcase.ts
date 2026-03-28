import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const SHOWCASE_KEY = 'showcase'

const defaultShowcase = {
  albumPreviews: [] as { title: string; imageUrl: string; link: string }[],
  flipbookPreviewUrl: '',
}

const getShowcase = async (c: any) => {
  const admin = getAdminSupabaseClient(c?.env as any)
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

const adminShowcase = new Hono()

// GET /api/admin/showcase
adminShowcase.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  try {
    const payload = await getShowcase(c)
    return c.json(payload)
  } catch (e) {
    return c.json({ error: 'Failed to load showcase' }, 500)
  }
})

// PUT /api/admin/showcase
adminShowcase.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const albumPreviews = Array.isArray(body?.albumPreviews)
    ? body.albumPreviews
        .filter((x: any) => x && typeof x.title === 'string' && typeof x.link === 'string')
        .map((x: any) => ({ title: x.title, imageUrl: typeof x.imageUrl === 'string' ? x.imageUrl : '', link: x.link }))
    : []
  const flipbookPreviewUrl = typeof body?.flipbookPreviewUrl === 'string' ? body.flipbookPreviewUrl : ''

  const admin = getAdminSupabaseClient(c?.env as any)
  const { error } = await admin
    .from('site_settings')
    .upsert({ key: SHOWCASE_KEY, value: { albumPreviews, flipbookPreviewUrl } }, { onConflict: 'key' })
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ albumPreviews, flipbookPreviewUrl })
})

export default adminShowcase
