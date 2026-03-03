import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/albums/[id]/unlock-feature
 * Body: { feature_type: 'flipbook' | 'tryon' | 'pose' | 'photogroup' | 'phototovideo' | 'image_remove_bg' }
 * 
 * Deducts credits from user and unlocks the feature for this album.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId } = await params
  if (!albumId) {
    return NextResponse.json({ error: 'Album ID required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { feature_type } = body as { feature_type?: string }

  const validFeatureTypes = ['flipbook', 'tryon', 'pose', 'photogroup', 'phototovideo', 'image_remove_bg']
  if (!feature_type || !validFeatureTypes.includes(feature_type)) {
    return NextResponse.json({ error: 'Invalid feature_type' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Check album exists and user is owner
  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  // For flipbook unlock, only owner can unlock
  if (feature_type === 'flipbook' && album.user_id !== user.id) {
    return NextResponse.json({ error: 'Hanya pemilik album yang bisa membuka fitur flipbook' }, { status: 403 })
  }

  // Check if already unlocked
  const { data: existingUnlock } = await admin
    .from('feature_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('album_id', albumId)
    .eq('feature_type', feature_type)
    .maybeSingle()

  if (existingUnlock) {
    return NextResponse.json({ error: 'Fitur sudah dibuka', already_unlocked: true }, { status: 409 })
  }

  // Get credit cost from ai_feature_pricing (use credits_per_unlock column)
  const featureSlug = feature_type === 'flipbook' ? 'flipbook_unlock' : feature_type
  const { data: pricing } = await admin
    .from('ai_feature_pricing')
    .select('credits_per_unlock')
    .eq('feature_slug', featureSlug)
    .maybeSingle()

  const creditCost = pricing?.credits_per_unlock ?? 0

  // Get user's current credits
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (userErr || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const currentCredits = userRow.credits ?? 0

  if (creditCost > 0 && currentCredits < creditCost) {
    return NextResponse.json(
      {
        error: `Credit kamu tidak cukup. Butuh ${creditCost} credit, kamu punya ${currentCredits} credit.`,
        credits_needed: creditCost,
        credits_current: currentCredits,
      },
      { status: 402 }
    )
  }

  // Deduct credits
  if (creditCost > 0) {
    const newCredits = currentCredits - creditCost
    const { error: updateErr } = await admin
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id)

    if (updateErr) {
      return NextResponse.json({ error: 'Gagal mengurangi credit' }, { status: 500 })
    }
  }

  // Create unlock record
  const { data: unlock, error: unlockErr } = await admin
    .from('feature_unlocks')
    .insert({
      user_id: user.id,
      album_id: albumId,
      feature_type,
      credits_spent: creditCost,
    })
    .select()
    .single()

  if (unlockErr) {
    // Refund credits if unlock failed
    if (creditCost > 0) {
      await admin
        .from('users')
        .update({ credits: currentCredits })
        .eq('id', user.id)
    }
    return NextResponse.json({ error: 'Gagal membuka fitur: ' + unlockErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    feature_type,
    credits_spent: creditCost,
    credits_remaining: (currentCredits - creditCost),
    unlock,
  })
}

/**
 * GET /api/albums/[id]/unlock-feature
 * Returns all unlocked features for this album for the current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId } = await params

  const admin = createAdminClient()
  const client = admin ?? supabase

  // Get user's unlocks for this album
  const { data: unlocks, error } = await client
    .from('feature_unlocks')
    .select('feature_type, credits_spent, unlocked_at')
    .eq('user_id', user.id)
    .eq('album_id', albumId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  return NextResponse.json({
    unlocks: unlocks ?? [],
    unlocked_features: unlockedFeatures,
    flipbook_enabled_by_package: flipbookEnabledByPackage,
    ai_labs_features_by_package: aiLabsFeaturesByPackage,
    is_owner: album?.user_id === user.id,
    credit_costs: creditCosts,
  })
}
