import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Unified AI pricing & credit consumption endpoint:
 * 
 * GET  /api/admin/ai-edit               → list ai_feature_pricing (semua fitur + harganya)
 * PUT  /api/admin/ai-edit               → update credits_per_use suatu fitur (admin only)
 * POST /api/admin/ai-edit               → consume credits untuk fitur AI tertentu
 *                                          Body: { feature_slug, units? }
 */

// ── Helpers ──

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

async function getServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// ── GET: list pricing ──

export async function GET() {
  const supabase = await getAuthClient()

  const { data, error } = await supabase
    .from('ai_feature_pricing')
    .select('id, feature_slug, credits_per_use')
    .order('feature_slug', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// ── PUT: update pricing (admin only) ──

export async function PUT(request: Request) {
  const authClient = await getAuthClient()
  const adminClient = await getServiceClient()

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = body?.id as string | undefined
  const featureSlug = body?.feature_slug as string | undefined
  const creditsPerUse = body?.credits_per_use

  if ((!id && !featureSlug) || typeof creditsPerUse !== 'number' || creditsPerUse < 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  let query = adminClient
    .from('ai_feature_pricing')
    .update({ credits_per_use: creditsPerUse })
    .select('id, feature_slug, credits_per_use')

  if (id) {
    query = query.eq('id', id)
  } else if (featureSlug) {
    query = query.eq('feature_slug', featureSlug)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Pricing not found' }, { status: 404 })
  }

  return NextResponse.json(data[0])
}

// ── POST: consume credits ──

export async function POST(request: Request) {
  const supabase = await getAuthClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const featureSlug = (body?.feature_slug as string | undefined)?.trim()
  const unitsRaw = body?.units
  const units = typeof unitsRaw === 'number' && unitsRaw > 0 ? Math.floor(unitsRaw) : 1

  if (!featureSlug) {
    return NextResponse.json({ ok: false, error: 'feature_slug is required' }, { status: 400 })
  }

  const { data: pricing, error: pricingError } = await supabase
    .from('ai_feature_pricing')
    .select('credits_per_use')
    .eq('feature_slug', featureSlug)
    .maybeSingle()

  if (pricingError) {
    return NextResponse.json({ ok: false, error: pricingError.message }, { status: 500 })
  }

  const creditsPerUse = pricing?.credits_per_use ?? 0
  const cost = creditsPerUse * units

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (userError) {
    return NextResponse.json({ ok: false, error: userError.message }, { status: 500 })
  }

  const currentCredits = userRow?.credits ?? 0

  if (cost > 0 && currentCredits < cost) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Credit kamu tidak cukup untuk generate fitur ini. Silakan top up terlebih dahulu.',
        cost,
      },
      { status: 402 }
    )
  }

  const newCredits = cost > 0 ? currentCredits - cost : currentCredits

  if (cost > 0) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    creditsLeft: newCredits,
    cost,
  })
}
