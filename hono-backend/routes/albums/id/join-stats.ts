import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const albumsIdJoinStats = new Hono()

albumsIdJoinStats.get('/', async (c) => {
  const albumId = c.req.param('id')
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const album = await db
      .prepare(`SELECT id, user_id, students_count FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ id: string; user_id: string; students_count: number | null }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    // Join-stats is used by the registration flow; allow any authenticated user to read capacity/counts.

    const approved = await db
      .prepare(`SELECT COUNT(*) as c FROM album_class_access WHERE album_id = ? AND status = 'approved'`)
      .bind(albumId)
      .first<{ c: number }>()
    const pending = await db
      .prepare(`SELECT COUNT(*) as c FROM album_join_requests WHERE album_id = ? AND status = 'pending'`)
      .bind(albumId)
      .first<{ c: number }>()
    const rejected = await db
      .prepare(`SELECT COUNT(*) as c FROM album_join_requests WHERE album_id = ? AND status = 'rejected'`)
      .bind(albumId)
      .first<{ c: number }>()

    // Owner album dihitung sebagai 1 slot terisi, tapi jangan dobel jika owner sudah punya akses approved ke kelas.
    const ownerHasApprovedAccess = await db
      .prepare(`SELECT 1 as ok FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved' LIMIT 1`)
      .bind(albumId, album.user_id)
      .first<{ ok: number }>()

    const approved_count = (approved?.c ?? 0) + (ownerHasApprovedAccess ? 0 : 1)
    const pending_count = pending?.c ?? 0
    const rejected_count = rejected?.c ?? 0
    const limit_count = album.students_count ?? null
    const available_slots =
      typeof limit_count === 'number' && limit_count > 0
        ? Math.max(0, limit_count - approved_count)
        : 999999

    return c.json({
      limit_count,
      approved_count,
      pending_count,
      rejected_count,
      available_slots,
    })
  } catch (error) {
    console.error('Error fetching join stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

export default albumsIdJoinStats
