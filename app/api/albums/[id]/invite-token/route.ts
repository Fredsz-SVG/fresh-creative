import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { generateShortInviteCode } from '@/lib/invite-code'

export const dynamic = 'force-dynamic'

/**
 * GET: Get current student invite token for album
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId } = await params
  if (!albumId) {
    return NextResponse.json({ error: 'Album ID required' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
    .from('albums')
    .select('id, user_id, student_invite_token, student_invite_expires_at')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  // Check if user is owner or admin
  const isOwner = album.user_id === user.id
  if (!isOwner) {
    // Check if album admin
    const { data: member } = await supabase
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json({
    token: album.student_invite_token || null,
    expiresAt: album.student_invite_expires_at || null,
  })
}

/**
 * POST: Generate new student invite token for album
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId } = await params
  if (!albumId) {
    return NextResponse.json({ error: 'Album ID required' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  // Check if user is owner or admin
  const isOwner = album.user_id === user.id
  if (!isOwner) {
    // Check if album admin
    const { data: member } = await supabase
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Only album owner or admin can create invite token' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => ({}))
  const expiresInDays = body?.expiresInDays || 7

  // Generate new token (kode pendek saja)
  const token = generateShortInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Update album with new token
  const { error: updateErr } = await (supabaseAdmin || supabase)
    .from('albums')
    .update({
      student_invite_token: token,
      student_invite_expires_at: expiresAt.toISOString(),
    })
    .eq('id', albumId)

  if (updateErr) {
    console.error('Failed to update album with invite token:', updateErr)
    return NextResponse.json({ error: 'Failed to generate invite token' }, { status: 500 })
  }

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
  })
}
