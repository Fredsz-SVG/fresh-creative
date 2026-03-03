import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

async function getUser() {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function isAdmin(userId: string) {
  const admin = getAdminClient()
  const { data } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

// ── GET: list redeem codes (admin) ──
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('redeem_codes')
    .select('*, redeem_history(id, user_id, credits_received, redeemed_at)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST: create redeem code (admin) OR redeem code (user) ──
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { action } = body

  // User redeeming a code
  if (action === 'redeem') {
    return handleRedeem(user.id, body.code)
  }

  // Admin creating a code
  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return handleCreate(body)
}

// ── PUT: update redeem code (admin) ──
export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { id, credits, max_uses, is_active, expires_at } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const admin = getAdminClient()
  const updateObj: Record<string, any> = {}
  if (typeof credits === 'number' && credits > 0) updateObj.credits = credits
  if (typeof max_uses === 'number' && max_uses >= 1) updateObj.max_uses = max_uses
  if (typeof is_active === 'boolean') updateObj.is_active = is_active
  if (expires_at !== undefined) updateObj.expires_at = expires_at || null

  const { data, error } = await admin
    .from('redeem_codes')
    .update(updateObj)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data[0])
}

// ── DELETE: delete redeem code (admin) ──
export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const admin = getAdminClient()
  const { error } = await admin
    .from('redeem_codes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── Helpers ──

async function handleCreate(body: any) {
  const { code, credits, max_uses, expires_at } = body

  if (!code || typeof credits !== 'number' || credits <= 0) {
    return NextResponse.json({ error: 'Code and credits are required' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('redeem_codes')
    .insert({
      code: code.toUpperCase().trim(),
      credits,
      max_uses: max_uses ?? 1,
      expires_at: expires_at || null,
    })
    .select()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Kode sudah ada, gunakan kode lain.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data[0], { status: 201 })
}

async function handleRedeem(userId: string, code?: string) {
  if (!code || !code.trim()) {
    return NextResponse.json({ error: 'Kode redeem harus diisi.' }, { status: 400 })
  }

  const admin = getAdminClient()
  const cleanCode = code.toUpperCase().trim()

  // Find the code
  const { data: redeemCode, error: findErr } = await admin
    .from('redeem_codes')
    .select('*')
    .eq('code', cleanCode)
    .maybeSingle()

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (!redeemCode) return NextResponse.json({ error: 'Kode tidak ditemukan.' }, { status: 404 })

  // Check active
  if (!redeemCode.is_active) {
    return NextResponse.json({ error: 'Kode sudah tidak aktif.' }, { status: 410 })
  }

  // Check expired
  if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kode sudah kadaluarsa.' }, { status: 410 })
  }

  // Check max uses
  if (redeemCode.used_count >= redeemCode.max_uses) {
    return NextResponse.json({ error: 'Kode sudah mencapai batas pemakaian.' }, { status: 410 })
  }

  // Check if user already redeemed
  const { data: existing } = await admin
    .from('redeem_history')
    .select('id')
    .eq('redeem_code_id', redeemCode.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Kamu sudah pernah menggunakan kode ini.' }, { status: 409 })
  }

  // Add credits to user
  const { data: userRow } = await admin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single()

  const currentCredits = userRow?.credits ?? 0
  const newCredits = currentCredits + redeemCode.credits

  const { error: updateErr } = await admin
    .from('users')
    .update({ credits: newCredits })
    .eq('id', userId)

  if (updateErr) return NextResponse.json({ error: 'Gagal menambah credit.' }, { status: 500 })

  // Record history
  await admin.from('redeem_history').insert({
    redeem_code_id: redeemCode.id,
    user_id: userId,
    credits_received: redeemCode.credits,
  })

  // Increment used_count
  await admin
    .from('redeem_codes')
    .update({ used_count: redeemCode.used_count + 1 })
    .eq('id', redeemCode.id)

  return NextResponse.json({
    ok: true,
    credits_received: redeemCode.credits,
    credits_total: newCredits,
  })
}
