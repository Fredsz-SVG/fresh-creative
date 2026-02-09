import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** DELETE: Hapus member dari kelas (owner bisa hapus siapa saja, member bisa hapus diri sendiri). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string; userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId, classId, userId } = await params
    if (!albumId || !classId || !userId) {
      return NextResponse.json({ error: 'Album ID, class ID, and user ID required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const client = admin ?? supabase

    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

    const role = await getRole(supabase, user)
    const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
    const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    const isAlbumAdmin = (memberRow as { role?: string } | null)?.role === 'admin'
    const canManage = isOwner || isAlbumAdmin

    if (!canManage && user.id !== userId) {
      return NextResponse.json({ error: 'Hanya owner/admin album atau diri sendiri yang bisa menghapus profil' }, { status: 403 })
    }

    const { data: cls } = await client
      .from('album_classes')
      .select('id, album_id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()

    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    // Find the access record
    const { data: access, error: findErr } = await client
      .from('album_class_access')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle()

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!access) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Delete the access record
    const { error: deleteErr } = await client
      .from('album_class_access')
      .delete()
      .eq('id', (access as { id: string }).id)

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting member:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** PATCH: Owner atau admin album sunting profil member di kelas ini. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string; userId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId, userId } = await params
  if (!albumId || !classId || !userId) {
    return NextResponse.json({ error: 'Album ID, class ID, and user ID required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const isOwner = (album as { user_id: string }).user_id === user.id
  const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
  const isAlbumAdmin = (memberRow as { role?: string } | null)?.role === 'admin'
  const canManage = isOwner || isAlbumAdmin

  if (!canManage) return NextResponse.json({ error: 'Hanya owner atau admin album yang bisa menyunting profil orang lain' }, { status: 403 })

  const { data: access, error: findErr } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle()

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (!access) return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined
  const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined
  const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined
  const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined
  const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined

  if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
    return NextResponse.json({ error: 'Minimal satu field required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
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
