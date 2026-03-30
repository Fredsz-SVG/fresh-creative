import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { getUserRow } from '../../lib/d1-users'
import Replicate from 'replicate'


const PHOTO_GROUP_MODEL = 'flux-kontext-apps/multi-image-list'

function getOutputUrl(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object' && 'url' in output) {
    const u = (output as any).url
    return typeof u === 'function' ? u() : typeof u === 'string' ? u : ''
  }
  return ''
}

const photogroup = new Hono()

photogroup.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)
    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('photogroup')
      .first<{ credits_per_use: number }>()
    const creditsPerUse = pricing?.credits_per_use ?? 0
    const userRow = await getUserRow(db, user.id)
    if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
      return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }
    const REPLICATE_API_TOKEN = (c.env as any).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)
    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    const body = await c.req.json()
    const subjects = body.subjects
    if (!subjects || !Array.isArray(subjects) || subjects.length < 2) return c.json({ ok: false, error: 'Minimal 2 gambar' }, 400)
    if (subjects.length > 10) return c.json({ ok: false, error: 'Maksimal 10 gambar' }, 400)
    if (!(body.prompt || '').trim()) return c.json({ ok: false, error: 'Prompt wajib diisi!' }, 400)
    const output = await replicate.run(PHOTO_GROUP_MODEL as any, { input: { prompt: body.prompt, aspect_ratio: body.aspect_ratio || 'match_input_image', input_images: subjects, output_format: body.output_format || 'png', safety_tolerance: 2 } })
    const result = getOutputUrl(output)
    if (!result) return c.json({ ok: false, error: 'Tidak ada hasil' }, 500)
    if (creditsPerUse > 0) {
      const latest = await getUserRow(db, user.id)
      await db
        .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(Math.max((latest?.credits ?? 0) - creditsPerUse, 0), user.id)
        .run()
    }
    return c.json({ ok: true, result })
  } catch (err: any) {
    console.error('Photo Group error:', err)
    return c.json({ ok: false, error: err?.message || 'Gagal' }, 500)
  }
})

export default photogroup
