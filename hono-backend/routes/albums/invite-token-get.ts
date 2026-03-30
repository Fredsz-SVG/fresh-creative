import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'

const inviteTokenGet = new Hono()

inviteTokenGet.get('/:token', async (c) => {
  const token = c.req.param('token')
  if (!token) return c.json({ error: 'Token required' }, 400)

  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const album = await db
    .prepare(
      `SELECT id, name, type, student_invite_expires_at, description, cover_image_url FROM albums WHERE student_invite_token = ?`
    )
    .bind(token)
    .first<{
      id: string
      name: string
      type: string
      student_invite_expires_at: string | null
      description: string | null
      cover_image_url: string | null
    }>()

  if (!album) return c.json({ error: 'Invite not found or invalid' }, 404)

  const expiresAt = album.student_invite_expires_at ? new Date(album.student_invite_expires_at) : null
  if (expiresAt && expiresAt < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
  }

  return c.json({
    inviteType: 'student',
    albumId: album.id,
    name: album.name,
    type: album.type,
    description: album.description,
    coverImageUrl: album.cover_image_url,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  })
})

export default inviteTokenGet
