import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1 } from '../../../../lib/edge-env'
import { parseJsonArray } from '../../../../lib/d1-json'

const classMembersRoute = new Hono()

classMembersRoute.get('/', async (c) => {
  try {
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

    const role = await getRole(c, user)
    const isOwner = album.user_id === user.id || role === 'admin'
    if (!isOwner) {
      const member = await db
        .prepare(`SELECT album_id FROM album_members WHERE album_id = ? AND user_id = ?`)
        .bind(albumId, user.id)
        .first<{ album_id: string }>()
      if (!member) {
        const classAccess = await db
          .prepare(
            `SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
          )
          .bind(albumId, user.id)
          .first<{ id: string }>()
        if (!classAccess) {
          return c.json({ error: 'Tidak punya akses ke album ini' }, 403)
        }
      }
    }

    const cls = await db
      .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ id: string; album_id: string }>()

    if (!cls) return c.json({ error: 'Class not found' }, 404)

    const { results: list } = await db
      .prepare(
        `SELECT user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status
         FROM album_class_access WHERE class_id = ? AND status IN ('approved', 'pending') ORDER BY student_name ASC`
      )
      .bind(classId)
      .all<Record<string, unknown>>()

    const members = (list ?? [])
      .filter((r) => isOwner || r.status === 'approved')
      .map((r) => ({
        user_id: r.user_id,
        student_name: r.student_name,
        email: r.email ?? null,
        date_of_birth: r.date_of_birth ?? null,
        instagram: r.instagram ?? null,
        message: r.message ?? null,
        video_url: r.video_url ?? null,
        photos: parseJsonArray(r.photos as string),
        is_me: r.user_id === user.id,
        status: r.status,
      }))

    return c.json(members, 200)
  } catch (err: unknown) {
    console.error('Error fetching members:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default classMembersRoute
