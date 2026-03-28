import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const aiEdit = new Hono()

// GET - list ai_feature_pricing
aiEdit.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase
    .from('ai_feature_pricing')
    .select('id, feature_slug, credits_per_use, credits_per_unlock')
    .order('feature_slug', { ascending: true })
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

// PUT - update pricing (admin only)
aiEdit.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const adminClient = getAdminSupabaseClient(c?.env as any)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const body = await c.req.json()
  const { id, feature_slug, credits_per_use, credits_per_unlock } = body
  const hasUse = typeof credits_per_use === 'number' && credits_per_use >= 0
  const hasUnlock = typeof credits_per_unlock === 'number' && credits_per_unlock >= 0
  if ((!id && !feature_slug) || (!hasUse && !hasUnlock)) {
    return c.json({ error: 'Invalid payload' }, 400)
  }
  const updateObj: Record<string, number> = {}
  if (hasUse) updateObj.credits_per_use = credits_per_use
  if (hasUnlock) updateObj.credits_per_unlock = credits_per_unlock
  let query = adminClient.from('ai_feature_pricing').update(updateObj).select('id, feature_slug, credits_per_use, credits_per_unlock')
  if (id) query = query.eq('id', id)
  else if (feature_slug) query = query.eq('feature_slug', feature_slug)
  const { data, error } = await query.maybeSingle()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

export default aiEdit
