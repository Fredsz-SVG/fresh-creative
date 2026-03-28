import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const albumsIdUnlockFeature = new Hono()

// GET /api/albums/:id/unlock-feature
albumsIdUnlockFeature.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const albumId = c.req.param('id')
  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase
  const { data: unlocks, error } = await client
    .from('feature_unlocks')
    .select('feature_type, credits_spent, unlocked_at')
    .eq('user_id', user.id)
    .eq('album_id', albumId)
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  const { data: album } = await client
    .from('albums')
    .select('pricing_package_id, user_id')
    .eq('id', albumId)
    .single()
  let flipbookEnabledByPackage = false
  let aiLabsFeaturesByPackage: string[] = []
  if (album?.pricing_package_id) {
    const { data: pkg } = await client
      .from('pricing_packages')
      .select('flipbook_enabled, ai_labs_features')
      .eq('id', album.pricing_package_id)
      .single()
    flipbookEnabledByPackage = pkg?.flipbook_enabled ?? false
    aiLabsFeaturesByPackage = pkg?.ai_labs_features ?? []
  }
  const { data: featurePricing } = await client
    .from('ai_feature_pricing')
    .select('feature_slug, credits_per_unlock')
  const creditCosts: Record<string, number> = {}
  if (featurePricing) {
    for (const fp of featurePricing) {
      creditCosts[fp.feature_slug] = fp.credits_per_unlock
    }
  }
  const unlockedFeatures = (unlocks ?? []).map(u => u.feature_type)
  return c.json({
    unlocks: unlocks ?? [],
    unlocked_features: unlockedFeatures,
    flipbook_enabled_by_package: flipbookEnabledByPackage,
    ai_labs_features_by_package: aiLabsFeaturesByPackage,
    is_owner: album?.user_id === user.id,
    credit_costs: creditCosts,
  })
})

// POST /api/albums/:id/unlock-feature
albumsIdUnlockFeature.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const featureType = body?.feature_type
  if (!albumId || !featureType || typeof featureType !== 'string') {
    return c.json({ error: 'feature_type required' }, 400)
  }
  const admin = getAdminSupabaseClient(c?.env as any)
  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const isOwner = album.user_id === user.id
  if (!isOwner) {
    const { data: member } = await admin
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member || member.role !== 'admin') {
      return c.json({ error: 'Hanya pemilik atau admin album yang dapat membuka fitur.' }, 403)
    }
  }
  const { data: existing } = await admin
    .from('feature_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('album_id', albumId)
    .eq('feature_type', featureType)
    .maybeSingle()
  if (existing) return c.json({ error: 'Fitur sudah dibuka sebelumnya.' }, 409)
  const featureSlug = featureType === 'flipbook' ? 'flipbook_unlock' : featureType
  const { data: pricing } = await admin
    .from('ai_feature_pricing')
    .select('credits_per_unlock')
    .eq('feature_slug', featureSlug)
    .maybeSingle()
  const cost = pricing?.credits_per_unlock ?? 0
  if (cost <= 0) return c.json({ error: 'Fitur tidak dapat dibuka dengan credit.' }, 400)
  const { data: userRow } = await admin.from('users').select('credits').eq('id', user.id).single()
  const credits = userRow?.credits ?? 0
  if (credits < cost) {
    return c.json({ error: 'Credit tidak cukup. Silakan top up terlebih dahulu.' }, 402)
  }
  const unlockedAt = new Date().toISOString()
  const { error: insertErr } = await admin.from('feature_unlocks').insert({
    user_id: user.id,
    album_id: albumId,
    feature_type: featureType,
    credits_spent: cost,
    unlocked_at: unlockedAt,
  })
  if (insertErr) return c.json({ error: insertErr.message }, 500)
  const { error: updateErr } = await admin
    .from('users')
    .update({ credits: Math.max(0, credits - cost) })
    .eq('id', user.id)
  if (updateErr) return c.json({ error: 'Gagal memotong credit.' }, 500)
  return c.json({ ok: true, unlocked_at: unlockedAt })
})

export default albumsIdUnlockFeature