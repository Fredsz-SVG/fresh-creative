import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** GET: Validate invite token and return album info (no auth required). */
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

  const { data: invite, error: inviteErr } = await admin
    .from('album_invites')
    .select('id, album_id, expires_at, role')
    .eq('token', token)
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invite not found or invalid' }, { status: 404 })
  }

  const expiresAt = new Date((invite as { expires_at: string }).expires_at)
  if (expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, name, type')
    .eq('id', (invite as { album_id: string }).album_id)
    .single()

  if (albumErr || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  return NextResponse.json({
    albumId: (album as { id: string }).id,
    name: (album as { name: string }).name,
    type: (album as { type: string }).type,
    role: (invite as { role: string }).role,
    expiresAt: expiresAt.toISOString(),
  })
}
