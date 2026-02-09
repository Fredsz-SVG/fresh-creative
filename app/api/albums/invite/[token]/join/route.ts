import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** POST: Join album as member using invite token. User must be logged in. Inherits role from invite. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in to join.' }, { status: 401 })
  }

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

  const albumId = (invite as { album_id: string }).album_id
  const inviteRole = (invite as { role: string }).role || 'member'

  const { data: existing } = await supabase
    .from('album_members')
    .select('album_id, role')
    .eq('album_id', albumId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Already member. Option: Update role if invite is higher privilege?
    // For now, just return success. If they want to upgrade, they should leave and rejoin or be promoted.
    // Or we can simple update valid role if invite says admin and current is member.
    if (inviteRole === 'admin' && (existing as { role: string }).role !== 'admin') {
      await supabase
        .from('album_members')
        .update({ role: 'admin' })
        .eq('album_id', albumId)
        .eq('user_id', user.id)
      return NextResponse.json({ message: 'Role upgraded to admin', albumId }, { status: 200 })
    }
    return NextResponse.json({ message: 'Already a member', albumId }, { status: 200 })
  }

  const { error: insertErr } = await supabase
    .from('album_members')
    .insert({
      album_id: albumId,
      user_id: user.id,
      role: inviteRole
    })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ message: `Joined album as ${inviteRole}`, albumId }, { status: 200 })
}
