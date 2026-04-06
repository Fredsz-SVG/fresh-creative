import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getShowcaseFromD1, saveShowcaseToD1, type ShowcasePayload } from '../../lib/showcase-d1'
import { getFonnteConfigFromD1, saveFonnteConfigToD1, type FonnteConfigPayload } from '../../lib/fonnte-config-d1'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { publishRealtimeEventFromContext } from '../../lib/realtime'

const adminShowcase = new Hono()

function normalizeShowcaseLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (/(?:^|\/)(album|yearbook)\//i.test(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return trimmed
  } catch {
    return trimmed
  }
}

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
    const [showcase, fonnte] = await Promise.all([
      getShowcaseFromD1(db),
      getFonnteConfigFromD1(db),
    ])
    return c.json({ ...showcase, ...fonnte })
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
  
  // Showcase payload
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
          link: normalizeShowcaseLink(x.link),
        }))
    : []
  const flipbookPreviewUrl = typeof body?.flipbookPreviewUrl === 'string'
    ? normalizeShowcaseLink(body.flipbookPreviewUrl)
    : ''
  const showcasePayload: ShowcasePayload = { albumPreviews, flipbookPreviewUrl }

  // Fonnte config payload
  const target = typeof body?.target === 'string' ? body.target.trim() : ''
  const fonntPayload: FonnteConfigPayload = { target }

  try {
    await Promise.all([
      saveShowcaseToD1(db, showcasePayload),
      saveFonnteConfigToD1(db, fonntPayload),
    ])
    await publishRealtimeEventFromContext(c, {
      type: 'showcase.updated',
      channel: 'showcase',
      payload: { action: 'replace' },
      ts: new Date().toISOString(),
    })
    return c.json({ ...showcasePayload, ...fonntPayload })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'save failed'
    return c.json({ error: msg }, 500)
  }
})

export default adminShowcase
