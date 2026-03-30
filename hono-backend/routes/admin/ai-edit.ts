import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'

const aiEdit = new Hono()

// GET - list ai_feature_pricing
aiEdit.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { results } = await db
    .prepare(
      `SELECT id, feature_slug, credits_per_use, credits_per_unlock FROM ai_feature_pricing ORDER BY feature_slug ASC`
    )
    .all<{ id: string; feature_slug: string; credits_per_use: number; credits_per_unlock: number }>()
  return c.json(results ?? [])
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
  const { id, feature_slug, credits_per_use, credits_per_unlock } = body
  const hasUse = typeof credits_per_use === 'number' && credits_per_use >= 0
  const hasUnlock = typeof credits_per_unlock === 'number' && credits_per_unlock >= 0
  if ((!id && !feature_slug) || (!hasUse && !hasUnlock)) {
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
          `SELECT id, feature_slug, credits_per_use, credits_per_unlock FROM ai_feature_pricing WHERE id = ?`
        )
        .bind(id)
        .first<{ id: string; feature_slug: string; credits_per_use: number; credits_per_unlock: number }>()
    : await db
        .prepare(
          `SELECT id, feature_slug, credits_per_use, credits_per_unlock FROM ai_feature_pricing WHERE feature_slug = ?`
        )
        .bind(feature_slug)
        .first<{ id: string; feature_slug: string; credits_per_use: number; credits_per_unlock: number }>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

export default aiEdit
