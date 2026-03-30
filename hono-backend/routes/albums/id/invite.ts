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
  const { data: { user } } = await supabase.auth.getUser()
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

  const body = await c.req.json().catch(() => ({}))
  const inviteRole = body?.role === 'admin' ? 'admin' : 'member'
  if (inviteRole === 'admin' && !isOwner && !isSysAdmin) {
    return c.json({ error: 'Only main owner can create admin invites' }, 403)
  }

  const token = generateShortInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const id = crypto.randomUUID()
  try {
    await db
      .prepare(
        `INSERT INTO album_invites (id, album_id, token, created_by, role, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(id, albumId, token, user.id, inviteRole, expiresAt.toISOString())
      .run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return c.json({ error: msg }, 500)
  }

  const row = await db
    .prepare(`SELECT id, token, expires_at, role FROM album_invites WHERE id = ?`)
    .bind(id)
    .first<{ id: string; token: string; expires_at: string; role: string }>()
  if (!row) return c.json({ error: 'Insert failed' }, 500)

  const origin = c.req.header('origin') || ''
  const inviteLink = `${origin}/join/${row.token}`

  return c.json({
    token: row.token,
    role: row.role,
    inviteLink,
    expiresAt: row.expires_at,
  })
})

export default albumInviteRoute
