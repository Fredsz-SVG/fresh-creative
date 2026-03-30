import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const albumsIdMyAccessAll = new Hono()

albumsIdMyAccessAll.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return c.json({ access: {}, requests: {} })
    }

    const albumId = c.req.param('id')
    if (!albumId) {
      return c.json({ error: 'Album ID required' }, 400)
    }

    const { results: accessRows } = await db
      .prepare(
        `SELECT id, class_id, album_id, user_id, student_name, email, status, date_of_birth, instagram, message, video_url, photos, created_at
         FROM album_class_access WHERE album_id = ? AND user_id = ?`
      )
      .bind(albumId, user.id)
      .all<Record<string, unknown>>()

    const { results: requestRows } = await db
      .prepare(
        `SELECT id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at
         FROM album_join_requests WHERE album_id = ? AND user_id = ?`
      )
      .bind(albumId, user.id)
      .all<Record<string, unknown>>()

    const accessByClass: Record<string, unknown> = {}
    accessRows?.forEach((item) => {
      const cid = item.class_id as string
      if (cid) accessByClass[cid] = item
    })

    const requestsByClassMap: Record<string, unknown> = {}
    requestRows?.forEach((item) => {
      const cid = item.assigned_class_id as string
      if (cid) requestsByClassMap[cid] = item
    })

    return c.json({ access: accessByClass, requests: requestsByClassMap })
  } catch (err: unknown) {
    console.error('Error in my-access-all:', err)
    return c.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500)
  }
})

export default albumsIdMyAccessAll
