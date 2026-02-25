import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

