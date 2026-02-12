import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** GET: Validate invite token and return album info (no auth required). 
 * Currently only supports student invites (albums.student_invite_token)
 * Admin/member invites are deprecated - use direct email invitation instead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  // Check if it's a student invite token
  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, name, type, student_invite_expires_at, description, cover_image_url')
    .eq('student_invite_token', token)
    .maybeSingle()

  if (!album) {
    return NextResponse.json({ error: 'Invite not found or invalid' }, { status: 404 })
  }

  // Check expiration
  const expiresAt = album.student_invite_expires_at
    ? new Date(album.student_invite_expires_at)
    : null

  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  return NextResponse.json({
    inviteType: 'student',
    albumId: album.id,
    name: album.name,
    type: album.type,
    description: album.description,
    coverImageUrl: album.cover_image_url,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  })
}
