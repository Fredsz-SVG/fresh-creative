import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

// GET all pricing packages
export async function GET() {
  const supabase = createAdminSupabase()
  const { data, error } = await supabase.from('pricing_packages').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST a new pricing package (admin only)
export async function POST(request: Request) {
  const supabase = createAdminSupabase()

  const { name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = await request.json()

  const { data, error } = await supabase
    .from('pricing_packages')
    .insert([{ name, price_per_student: Number(price_per_student), min_students: Number(min_students), features, flipbook_enabled: !!flipbook_enabled, ai_labs_features: ai_labs_features ?? [], is_popular: !!is_popular }])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// PUT (update) an existing pricing package (admin only)
export async function PUT(request: Request) {
  const supabase = createAdminSupabase()

  const body = await request.json()
  const { id, name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = body

  if (!id) {
    return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
  }

  const updatePayload = {
    name,
    price_per_student: Number(price_per_student),
    min_students: Number(min_students),
    features,
    flipbook_enabled: !!flipbook_enabled,
    ai_labs_features: ai_labs_features ?? [],
    is_popular: !!is_popular,
  }

  const { data, error } = await supabase
    .from('pricing_packages')
    .update(updatePayload)
    .eq('id', id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Package not found or update failed' }, { status: 404 })
  }
  return NextResponse.json(data)
}

// DELETE a pricing package (admin only)
export async function DELETE(request: Request) {
  const supabase = createAdminSupabase()

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
  }

  const { error } = await supabase.from('pricing_packages').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ message: 'Package deleted successfully' })
}
