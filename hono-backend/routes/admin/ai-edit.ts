import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'

const aiEdit = new Hono()

// GET - list ai_feature_pricing
aiEdit.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { results } = await db
    .prepare(
      `SELECT id, feature_slug, credits_per_use, credits_per_unlock, duration_credits_json FROM ai_feature_pricing ORDER BY feature_slug ASC`
    )
    .all<{
      id: string
      feature_slug: string
      credits_per_use: number
      credits_per_unlock: number
      duration_credits_json: string | null
    }>()
  return c.json(results ?? [])
})

// POST — potong credit sekali pakai (Image Editor remove-bg, dll.; Try On utama lewat /api/ai-features/tryon)
aiEdit.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)

    const body = (await c.req.json().catch(() => ({}))) as { feature_slug?: string }
    const feature_slug = typeof body.feature_slug === 'string' ? body.feature_slug.trim() : ''
    if (!feature_slug) return c.json({ ok: false, error: 'feature_slug wajib' }, 400)

    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind(feature_slug)
      .first<{ credits_per_use: number }>()
    const creditsPerUse = pricing?.credits_per_use ?? 0
    if (creditsPerUse > 0) {
      const r = await deductCreditsFromSupabaseAndMirrorToD1({
        env: c.env as Record<string, string>,
        db,
        userId: user.id,
        amount: creditsPerUse,
      })
      if (!r.ok) return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }
    return c.json({ ok: true })
  } catch (err: unknown) {
    console.error('ai-edit POST error:', err)
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Gagal' }, 500)
  }
})

// PUT - update pricing (admin only)
aiEdit.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, user)) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  const { id, feature_slug, credits_per_use, credits_per_unlock, duration_credits_json } = body as {
    id?: string
    feature_slug?: string
    credits_per_use?: number
    credits_per_unlock?: number
    duration_credits_json?: string | Record<string, unknown> | null
  }
  const hasUse = typeof credits_per_use === 'number' && credits_per_use >= 0
  const hasUnlock = typeof credits_per_unlock === 'number' && credits_per_unlock >= 0
  let durationJsonStr: string | null | undefined
  if (duration_credits_json === null) {
    durationJsonStr = null
  } else if (typeof duration_credits_json === 'string') {
    const t = duration_credits_json.trim()
    durationJsonStr = t === '' ? null : t
  } else if (typeof duration_credits_json === 'object' && duration_credits_json !== null) {
    durationJsonStr = JSON.stringify(duration_credits_json)
  }
  const hasDurationJson = duration_credits_json !== undefined
  if (hasDurationJson && durationJsonStr != null && durationJsonStr !== undefined) {
    try {
      JSON.parse(durationJsonStr)
    } catch {
      return c.json({ error: 'duration_credits_json bukan JSON valid' }, 400)
    }
  }
  if ((!id && !feature_slug) || (!hasUse && !hasUnlock && !hasDurationJson)) {
    return c.json({ error: 'Invalid payload' }, 400)
  }
  const sets: string[] = []
  const vals: unknown[] = []
  if (hasUse) {
    sets.push('credits_per_use = ?')
    vals.push(credits_per_use)
  }
  if (hasUnlock) {
    sets.push('credits_per_unlock = ?')
    vals.push(credits_per_unlock)
  }
  if (hasDurationJson) {
    sets.push('duration_credits_json = ?')
    vals.push(durationJsonStr === undefined ? null : durationJsonStr)
  }
  sets.push(`updated_at = datetime('now')`)
  if (id) {
    vals.push(id)
    const r = await db
      .prepare(`UPDATE ai_feature_pricing SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run()
    if (!r.success) return c.json({ error: 'Update failed' }, 500)
  } else if (feature_slug) {
    vals.push(feature_slug)
    const r = await db
      .prepare(`UPDATE ai_feature_pricing SET ${sets.join(', ')} WHERE feature_slug = ?`)
      .bind(...vals)
      .run()
    if (!r.success) return c.json({ error: 'Update failed' }, 500)
  }
  const row = id
    ? await db
        .prepare(
          `SELECT id, feature_slug, credits_per_use, credits_per_unlock, duration_credits_json FROM ai_feature_pricing WHERE id = ?`
        )
        .bind(id)
        .first<{
          id: string
          feature_slug: string
          credits_per_use: number
          credits_per_unlock: number
          duration_credits_json: string | null
        }>()
    : await db
        .prepare(
          `SELECT id, feature_slug, credits_per_use, credits_per_unlock, duration_credits_json FROM ai_feature_pricing WHERE feature_slug = ?`
        )
        .bind(feature_slug)
        .first<{
          id: string
          feature_slug: string
          credits_per_use: number
          credits_per_unlock: number
          duration_credits_json: string | null
        }>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

export default aiEdit
