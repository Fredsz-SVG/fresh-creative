import { Hono } from 'hono'
import { ensureUserInD1 } from '../../lib/d1-users'
import { getD1 } from '../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../middleware'

const inviteTokenJoin = new Hono<AppEnv>()
inviteTokenJoin.use('*', requireAuthJwt)

inviteTokenJoin.post('/:token/join', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user0 = c.get('user')
  if (!user0?.id) {
    return c.json({ error: 'Unauthorized. Please log in to join.' }, 401)
  }
  await ensureUserInD1(db, {
    id: user0.id,
    email: user0.email ?? null,
    user_metadata: {},
    app_metadata: user0.role ? { role: user0.role } : {},
  })

  const token = c.req.param('token')
  if (!token) {
    return c.json({ error: 'Token required' }, 400)
  }

  const albumByStudentToken = await db
    .prepare(`SELECT id, student_invite_expires_at FROM albums WHERE student_invite_token = ?`)
    .bind(token)
    .first<{ id: string; student_invite_expires_at: string | null }>()
  if (!albumByStudentToken) {
    return c.json({ error: 'Invite not found or invalid' }, 404)
  }
  if (
    albumByStudentToken.student_invite_expires_at &&
    new Date(albumByStudentToken.student_invite_expires_at) < new Date()
  ) {
    return c.json({ error: 'Invite expired' }, 410)
  }

  return c.json({
    redirectTo: `/invite/${token}`,
    message: 'Gunakan halaman pendaftaran untuk kode ini.',
    albumId: albumByStudentToken.id,
  })
})

export default inviteTokenJoin
