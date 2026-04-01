import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getShowcaseFromD1, saveShowcaseToD1, type ShowcasePayload } from '../../lib/showcase-d1'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { publishRealtimeEventFromContext } from '../../lib/realtime'

const adminShowcase = new Hono()

function requireDb(c: { env: unknown }): D1Database | null {
  return (c.env as { DB?: D1Database }).DB ?? null
}

// GET /api/admin/showcase
adminShowcase.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, user)) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  try {
    const payload = await getShowcaseFromD1(db)
    return c.json(payload)
  } catch {
    return c.json({ error: 'Failed to load showcase' }, 500)
  }
})

// PUT /api/admin/showcase
adminShowcase.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, user)) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const albumPreviews = Array.isArray(body?.albumPreviews)
    ? body.albumPreviews
        .filter(
          (x: unknown) =>
            x !== null &&
            typeof x === 'object' &&
            typeof (x as { title?: unknown }).title === 'string' &&
            typeof (x as { link?: unknown }).link === 'string'
        )
        .map((x: { title: string; link: string; imageUrl?: string }) => ({
          title: x.title,
          imageUrl: typeof x.imageUrl === 'string' ? x.imageUrl : '',
          link: x.link,
        }))
    : []
  const flipbookPreviewUrl = typeof body?.flipbookPreviewUrl === 'string' ? body.flipbookPreviewUrl : ''

  const payload: ShowcasePayload = { albumPreviews, flipbookPreviewUrl }
  try {
    await saveShowcaseToD1(db, payload)
    await publishRealtimeEventFromContext(c, {
      type: 'showcase.updated',
      channel: 'showcase',
      payload: { action: 'replace' },
      ts: new Date().toISOString(),
    })
    return c.json(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'save failed'
    return c.json({ error: msg }, 500)
  }
})

export default adminShowcase
