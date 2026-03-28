import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const inviteTokenJoin = new Hono()

inviteTokenJoin.post('/:token/join', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return c.json({ error: 'Unauthorized. Please log in to join.' }, 401)
  }

  const token = c.req.param('token')
  if (!token) {
    return c.json({ error: 'Token required' }, 400)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  if (!admin) {
    return c.json({ error: 'Server error' }, 500)
  }

  const { data: invite, error: inviteErr } = await admin
    .from('album_invites')
    .select('id, album_id, expires_at, role')
    .eq('token', token)
    .single()

  if (inviteErr || !invite) {
    // Token might be student_invite_token (registration page) instead of album_invites
    const { data: albumByStudentToken } = await admin
      .from('albums')
      .select('id')
      .eq('student_invite_token', token)
      .maybeSingle()
    if (albumByStudentToken) {
      return c.json({
        redirectTo: `/invite/${token}`,
        message: 'Gunakan halaman pendaftaran untuk kode ini.',
      })
    }
    return c.json({ error: 'Invite not found or invalid' }, 404)
  }

  const expiresAt = new Date((invite as { expires_at: string }).expires_at)
  if (expiresAt < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
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
    if (inviteRole === 'admin' && (existing as { role: string }).role !== 'admin') {
      await supabase
        .from('album_members')
        .update({ role: 'admin' })
        .eq('album_id', albumId)
        .eq('user_id', user.id)
      return c.json({ message: 'Role upgraded to admin', albumId })
    }
    return c.json({ message: 'Already a member', albumId })
  }

  const { error: insertErr } = await supabase
    .from('album_members')
    .insert({
      album_id: albumId,
      user_id: user.id,
      role: inviteRole
    })

  if (insertErr) {
    return c.json({ error: insertErr.message }, 500)
  }

  return c.json({ message: `Joined album as ${inviteRole}`, albumId })
})

export default inviteTokenJoin
