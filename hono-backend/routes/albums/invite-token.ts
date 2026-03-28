import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../../lib/supabase'

const inviteToken = new Hono()

inviteToken.get('/:token', async (c) => {
  const token = c.req.param('token')
  if (!token) return c.json({ error: 'Token required' }, 400)
  const admin = getAdminSupabaseClient(c?.env as any)
  const { data: album } = await admin
    .from('albums')
    .select('id, name, type, student_invite_expires_at, description, cover_image_url')
    .eq('student_invite_token', token)
    .maybeSingle()
  if (!album) return c.json({ error: 'Invite not found or invalid' }, 404)
  const expiresAt = album.student_invite_expires_at ? new Date(album.student_invite_expires_at) : null
  if (expiresAt && expiresAt < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
  }
  return c.json({
    inviteType: 'student', albumId: album.id, name: album.name, type: album.type,
    description: album.description, coverImageUrl: album.cover_image_url,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  })
})

export default inviteToken
