import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

function generateShortInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const albumInviteTokenRoute = new Hono()

albumInviteTokenRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const albumId = c.req.param('id')
  if (!albumId) {
    return c.json({ error: 'Album ID required' }, 400)
  }
  const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
  const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
    .from('albums')
    .select('id, user_id, student_invite_token, student_invite_expires_at')
    .eq('id', albumId)
    .single()
  if (albumErr || !album) {
    return c.json({ error: 'Album not found' }, 404)
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
      return c.json({ error: 'Forbidden' }, 403)
    }
  }
  return c.json({
    token: album.student_invite_token || null,
    expiresAt: album.student_invite_expires_at || null,
  })
})

albumInviteTokenRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const albumId = c.req.param('id')
  if (!albumId) {
    return c.json({ error: 'Album ID required' }, 400)
  }
  const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
  const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()
  if (albumErr || !album) {
    return c.json({ error: 'Album not found' }, 404)
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
      return c.json({ error: 'Only album owner or admin can create invite token' }, 403)
    }
  }
  const body = await c.req.json().catch(() => ({}))
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
    return c.json({ error: 'Failed to generate invite token' }, 500)
  }
  return c.json({
    token,
    expiresAt: expiresAt.toISOString(),
  })
})

export default albumInviteTokenRoute
