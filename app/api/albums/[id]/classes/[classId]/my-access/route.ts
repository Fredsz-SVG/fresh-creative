import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** GET: Akses saya di kelas ini (pending / approved / rejected). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: access, error } = await client
    .from('album_class_access')
    .select('id, student_name, email, status, created_at, date_of_birth, instagram, message, video_url')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!access) return NextResponse.json({ access: null })
  return NextResponse.json(access)
}

/** PATCH: Sunting nama/email saya di kelas ini (hanya jika sudah approved). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: access, error: fetchErr } = await client
    .from('album_class_access')
    .select('id, user_id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!access) return NextResponse.json({ error: 'Akses tidak ditemukan' }, { status: 404 })
  if ((access as { status: string }).status !== 'approved') return NextResponse.json({ error: 'Hanya bisa menyunting setelah akses disetujui' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined
  const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined
  const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined
  const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined
  const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined

  if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
    return NextResponse.json({ error: 'Minimal satu field required (student_name, email, date_of_birth, instagram, message, video_url)' }, { status: 400 })
  }
  const updates: {
    student_name?: string
    email?: string | null
    date_of_birth?: string | null
    instagram?: string | null
    message?: string | null
    video_url?: string | null
    updated_at: string
  } = { updated_at: new Date().toISOString() }
  if (student_name !== undefined) updates.student_name = student_name
  if (email !== undefined) updates.email = email
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth
  if (instagram !== undefined) updates.instagram = instagram
  if (message !== undefined) updates.message = message
  if (video_url !== undefined) updates.video_url = video_url

  const { data: updated, error } = await client
    .from('album_class_access')
    .update(updates)
    .eq('id', (access as { id: string }).id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}

/** DELETE: Hapus akses saya di kelas ini. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: access, error: fetchErr } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!access) return NextResponse.json({ error: 'Akses tidak ditemukan' }, { status: 404 })

  const { error: deleteErr } = await client
    .from('album_class_access')
    .delete()
    .eq('id', (access as { id: string }).id)

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  // Also delete from album_join_requests so user can re-register
  await client
    .from('album_join_requests')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
