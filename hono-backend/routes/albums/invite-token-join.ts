import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { getD1 } from '../../lib/edge-env'

const inviteTokenJoin = new Hono()

inviteTokenJoin.post('/:token/join', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return c.json({ error: 'Unauthorized. Please log in to join.' }, 401)
  }
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))

  const token = c.req.param('token')
  if (!token) {
    return c.json({ error: 'Token required' }, 400)
  }

  const invite = await db
    .prepare(`SELECT id, album_id, expires_at, role FROM album_invites WHERE token = ?`)
    .bind(token)
    .first<{ id: string; album_id: string; expires_at: string; role: string }>()

  if (!invite) {
    const albumByStudentToken = await db
      .prepare(`SELECT id FROM albums WHERE student_invite_token = ?`)
      .bind(token)
      .first<{ id: string }>()
    if (albumByStudentToken) {
      return c.json({
        redirectTo: `/invite/${token}`,
        message: 'Gunakan halaman pendaftaran untuk kode ini.',
      })
    }
    return c.json({ error: 'Invite not found or invalid' }, 404)
  }

  const expiresAt = new Date(invite.expires_at)
  if (expiresAt < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
  }

  const albumId = invite.album_id
  const inviteRole = invite.role || 'member'

  const existing = await db
    .prepare(`SELECT album_id, role FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, user.id)
    .first<{ album_id: string; role: string }>()

  if (existing) {
    if (inviteRole === 'admin' && existing.role !== 'admin') {
      await db
        .prepare(`UPDATE album_members SET role = 'admin' WHERE album_id = ? AND user_id = ?`)
        .bind(albumId, user.id)
        .run()
      return c.json({ message: 'Role upgraded to admin', albumId })
    }
    return c.json({ message: 'Already a member', albumId })
  }

  try {
    await db
      .prepare(
        `INSERT INTO album_members (album_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime('now'))`
      )
      .bind(albumId, user.id, inviteRole)
      .run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ error: msg }, 500)
  }

  return c.json({ message: `Joined album as ${inviteRole}`, albumId })
})

export default inviteTokenJoin
