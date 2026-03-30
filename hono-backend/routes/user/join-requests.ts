import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'

const userJoinRequests = new Hono()

userJoinRequests.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const { results: pendingRequests } = await db
      .prepare(
        `SELECT id, album_id, student_name, class_name, email, status, requested_at FROM album_join_requests
         WHERE user_id = ? AND status IN ('pending', 'rejected') ORDER BY requested_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>()

    const { results: approvedAccess } = await db
      .prepare(
        `SELECT id, album_id, class_id, student_name, email, status, created_at FROM album_class_access
         WHERE user_id = ? AND status = 'approved' ORDER BY created_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>()

    const allRequests: Record<string, unknown>[] = [
      ...(pendingRequests ?? []),
      ...(approvedAccess ?? []).map((acc) => ({ ...acc, requested_at: acc.created_at })),
    ]

    if (allRequests.length > 0) {
      const albumIds = [...new Set(allRequests.map((r) => r.album_id as string))]
      const classIds = [...new Set(allRequests.map((r) => r.class_id).filter(Boolean))] as string[]

      const albumPlaceholders = albumIds.map(() => '?').join(',')
      const { results: albums } = await db
        .prepare(`SELECT id, name FROM albums WHERE id IN (${albumPlaceholders})`)
        .bind(...albumIds)
        .all<{ id: string; name: string }>()

      let classes: { id: string; name: string }[] = []
      if (classIds.length > 0) {
        const cph = classIds.map(() => '?').join(',')
        const cr = await db
          .prepare(`SELECT id, name FROM album_classes WHERE id IN (${cph})`)
          .bind(...classIds)
          .all<{ id: string; name: string }>()
        classes = cr.results ?? []
      }

      const albumMap = new Map((albums ?? []).map((a) => [a.id, a.name]))
      const classMap = new Map(classes.map((cl) => [cl.id, cl.name]))

      return c.json(
        allRequests.map((req) => ({
          ...req,
          album_name: albumMap.get(req.album_id as string) || 'Unknown Album',
          class_name:
            req.class_name || (req.class_id ? classMap.get(req.class_id as string) : null) || null,
        }))
      )
    }

    return c.json([])
  } catch (error) {
    console.error('Error in user join-requests:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default userJoinRequests
