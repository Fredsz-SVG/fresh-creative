import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/** POST: Generate unique invite link for album. Only owner can create. Support role 'admin' for helpers. */
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

  // Check permission: Owner or System Admin
  const sysRole = await getRole(supabase, user)
  const isOwner = (album as { user_id: string }).user_id === user.id
  const isSysAdmin = sysRole === 'admin'

  if (!isOwner && !isSysAdmin) {
    // Check if album admin (helper owner) -> they can invite members but NOT admins?
    // Let's allow ONLY Owner to create ADMIN invites.
    // Helper admins can create MEMBER invites.

    // Check if user is album admin
    const { data: member } = await supabase
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .eq('role', 'admin') // explicit admin check
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Only album owner or admin can create invite' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => ({}))
  const inviteRole = body?.role === 'admin' ? 'admin' : 'member'

  // Only true Owner or System Admin can create "admin" invites
  if (inviteRole === 'admin' && !isOwner && !isSysAdmin) {
    return NextResponse.json({ error: 'Only main owner can create admin invites' }, { status: 403 })
  }

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invite, error: inviteErr } = await supabase
    .from('album_invites')
    .insert({
      album_id: albumId,
      token,
      created_by: user.id,
      role: inviteRole,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token, expires_at, role')
    .single()

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 })
  }

  const origin = request.headers.get('origin') || request.nextUrl.origin
  // Optional: append role query param for UX hints, but token determines role strictly
  const inviteLink = `${origin}/join/${(invite as { token: string }).token}`

  return NextResponse.json({
    token: (invite as { token: string }).token,
    role: (invite as { role: string }).role,
    inviteLink,
    expiresAt: (invite as { expires_at: string }).expires_at,
  })
}
