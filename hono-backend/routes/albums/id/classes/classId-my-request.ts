import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getD1 } from '../../../../lib/edge-env'

const myRequestRoute = new Hono()

myRequestRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const request_data = await db
    .prepare(
      `SELECT id, student_name, email, status, requested_at FROM album_join_requests
       WHERE assigned_class_id = ? AND user_id = ? AND album_id = ?`
    )
    .bind(classId, user.id, albumId)
    .first<Record<string, unknown>>()

  return c.json({ request: request_data ?? null })
})

export default myRequestRoute
