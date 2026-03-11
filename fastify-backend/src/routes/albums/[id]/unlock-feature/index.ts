import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  
    const { id: albumId } = request.params as any
  
    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase
  
    // Get user's unlocks for this album
    const { data: unlocks, error } = await client
      .from('feature_unlocks')
      .select('feature_type, credits_spent, unlocked_at')
      .eq('user_id', user.id)
      .eq('album_id', albumId)
  
    if (error) {
      return reply.code(500).send({ error: error.message })
    }
  
    // Get album's pricing package flipbook_enabled status
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
  
    // Get credit costs for all unlockable features (unlock pricing)
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
  
    return reply.send({
      unlocks: unlocks ?? [],
      unlocked_features: unlockedFeatures,
      flipbook_enabled_by_package: flipbookEnabledByPackage,
      ai_labs_features_by_package: aiLabsFeaturesByPackage,
      is_owner: album?.user_id === user.id,
      credit_costs: creditCosts,
    })

  })

  server.post('/', async (request: any, reply: any) => {
    const supabase = getSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id: albumId } = request.params as any
    const body = request.body as any
    const featureType = body?.feature_type
    if (!albumId || !featureType || typeof featureType !== 'string') {
      return reply.code(400).send({ error: 'feature_type required' })
    }

    const admin = getAdminSupabaseClient()
    const { data: album, error: albumErr } = await admin
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })

    const isOwner = album.user_id === user.id
    if (!isOwner) {
      const { data: member } = await admin
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!member || member.role !== 'admin') {
        return reply.code(403).send({ error: 'Hanya pemilik atau admin album yang dapat membuka fitur.' })
      }
    }

    const { data: existing } = await admin
      .from('feature_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('album_id', albumId)
      .eq('feature_type', featureType)
      .maybeSingle()
    if (existing) return reply.code(409).send({ error: 'Fitur sudah dibuka sebelumnya.' })

    const featureSlug = featureType === 'flipbook' ? 'flipbook_unlock' : featureType
    const { data: pricing } = await admin
      .from('ai_feature_pricing')
      .select('credits_per_unlock')
      .eq('feature_slug', featureSlug)
      .maybeSingle()
    const cost = pricing?.credits_per_unlock ?? 0
    if (cost <= 0) return reply.code(400).send({ error: 'Fitur tidak dapat dibuka dengan credit.' })

    const { data: userRow } = await admin.from('users').select('credits').eq('id', user.id).single()
    const credits = userRow?.credits ?? 0
    if (credits < cost) {
      return reply.code(402).send({ error: 'Credit tidak cukup. Silakan top up terlebih dahulu.' })
    }

    const unlockedAt = new Date().toISOString()
    const { error: insertErr } = await admin.from('feature_unlocks').insert({
      user_id: user.id,
      album_id: albumId,
      feature_type: featureType,
      credits_spent: cost,
      unlocked_at: unlockedAt,
    })
    if (insertErr) return reply.code(500).send({ error: insertErr.message })

    const { error: updateErr } = await admin
      .from('users')
      .update({ credits: Math.max(0, credits - cost) })
      .eq('id', user.id)
    if (updateErr) return reply.code(500).send({ error: 'Gagal memotong credit.' })

    return reply.send({ ok: true, unlocked_at: unlockedAt })
  })

}

export default route
