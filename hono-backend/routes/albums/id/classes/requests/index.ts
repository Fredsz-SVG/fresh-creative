import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../../lib/supabase'
import { getRole } from '../../../../../lib/auth'
import { getD1 } from '../../../../../lib/edge-env'

const classRequestsRoute = new Hono()

classRequestsRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const isOwner = album.user_id === user.id
  const globalRole = await getRole(c, user)
  if (!isOwner && globalRole !== 'admin') {
    const member = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    const isAlbumAdmin = member?.role === 'admin'
    if (!isAlbumAdmin) {
      return c.json({ error: 'Only owner or album admin can list requests' }, 403)
    }
  }

  const cls = await db
    .prepare(`SELECT id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string }>()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const statusFilter = c.req.query('status') ?? 'pending'

  if (statusFilter === 'pending') {
    try {
      const { results: list } = await db
        .prepare(
          `SELECT id, user_id, student_name, email, status, requested_at FROM album_join_requests
           WHERE assigned_class_id = ? AND status = 'pending' ORDER BY requested_at DESC`
        )
        .bind(classId)
        .all<Record<string, unknown>>()
      return c.json(list ?? [], 200)
    } catch {
      return c.json({ error: 'Server error fetching requests' }, 500)
    }
  }

  try {
    if (statusFilter !== 'all') {
      const { results: list } = await db
        .prepare(
          `SELECT id, user_id, student_name, email, status, created_at FROM album_class_access
           WHERE class_id = ? AND status = ? ORDER BY created_at DESC`
        )
        .bind(classId, statusFilter)
        .all<Record<string, unknown>>()
      return c.json(list ?? [], 200)
    }
    const { results: list } = await db
      .prepare(
        `SELECT id, user_id, student_name, email, status, created_at FROM album_class_access
         WHERE class_id = ? ORDER BY created_at DESC`
      )
      .bind(classId)
      .all<Record<string, unknown>>()
    return c.json(list ?? [], 200)
  } catch {
    return c.json({ error: 'Server error fetching requests' }, 500)
  }
})

export default classRequestsRoute
