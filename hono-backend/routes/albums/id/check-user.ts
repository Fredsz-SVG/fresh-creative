import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const checkUserRoute = new Hono()

checkUserRoute.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ hasRequest: false }, 200)
    }

    const existing = await db
      .prepare(`SELECT id, status FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ id: string; status: string }>()

    if (existing && existing.status === 'approved') {
      const classAccess = await db
        .prepare(
          `SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
        )
        .bind(albumId, user.id)
        .first<{ id: string }>()

      const memberAccess = await db
        .prepare(`SELECT 1 FROM album_members WHERE album_id = ? AND user_id = ?`)
        .bind(albumId, user.id)
        .first()

      if (classAccess || memberAccess) {
        return c.json({ hasRequest: true, status: 'approved' }, 200)
      }

      return c.json({ hasRequest: false })
    }

    if (existing) {
      return c.json({ hasRequest: true, status: existing.status })
    }

    return c.json({ hasRequest: false })
  } catch (error: unknown) {
    console.error('Error checking user request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default checkUserRoute
