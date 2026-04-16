import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'

function generateShortInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const albumInviteRoute = new Hono()

albumInviteRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const sysRole = await getRole(c, user)
  const isOwner = album.user_id === user.id
  const isSysAdmin = sysRole === 'admin'

  if (!isOwner && !isSysAdmin) {
    const member = await db
      .prepare(
        `SELECT role FROM album_members WHERE album_id = ? AND user_id = ? AND role = 'admin'`
      )
      .bind(albumId, user.id)
      .first<{ role: string }>()
    if (!member) return c.json({ error: 'Only album owner or admin can create invite' }, 403)
  }

  // Deprecated role-based invite is removed. We now use student_invite_token on albums.
  const token = generateShortInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const upd = await db
    .prepare(
      `UPDATE albums
       SET student_invite_token = ?, student_invite_expires_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(token, expiresAt.toISOString(), albumId)
    .run()
  if (!upd.success) return c.json({ error: 'Failed to generate invite token' }, 500)

  const origin = c.req.header('origin') || ''
  const inviteLink = `${origin}/invite/${token}`

  return c.json({
    token,
    role: 'member',
    inviteLink,
    expiresAt: expiresAt.toISOString(),
  })
})

export default albumInviteRoute
