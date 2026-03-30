import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'
import { parseJsonArray } from '../../../lib/d1-json'

const allClassMembersRoute = new Hono()

allClassMembersRoute.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const album = await db
      .prepare(`SELECT user_id FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ user_id: string }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const roleRes = await getRole(c, user)
    const memberRow = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    const studentRow = await db
      .prepare(
        `SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
      )
      .bind(albumId, user.id)
      .first<{ id: string }>()

    const isGlobalAdmin = roleRes === 'admin'
    const isOwner = album.user_id === user.id || isGlobalAdmin
    const isAlbumAdmin = memberRow?.role === 'admin'
    if (!isOwner && !memberRow && !studentRow) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const canSeePending = isOwner || isAlbumAdmin

    const { results: data } = await db
      .prepare(
        `SELECT class_id, user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status
         FROM album_class_access WHERE album_id = ? AND status IN ('approved', 'pending') ORDER BY student_name ASC`
      )
      .bind(albumId)
      .all<Record<string, unknown>>()

    const allMembers = data ?? []

    const result = allMembers
      .filter((r) => canSeePending || r.status === 'approved')
      .map((r) => ({
        class_id: r.class_id,
        user_id: r.user_id,
        student_name: r.student_name,
        email: r.email,
        date_of_birth: r.date_of_birth,
        instagram: r.instagram,
        message: r.message,
        video_url: r.video_url,
        photos: parseJsonArray(r.photos as string) || [],
        status: r.status,
        is_me: r.user_id === user.id,
      }))

    return c.json(result)
  } catch (err: unknown) {
    console.error('Error fetching all class members:', err)
    return c.json({ error: err instanceof Error ? err.message : 'Error' }, 500)
  }
})

export default allClassMembersRoute
