import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1 } from '../../../../lib/edge-env'

const albumsIdTeachers = new Hono()

// GET /api/albums/:id/teachers
albumsIdTeachers.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { results: teachers } = await db
      .prepare(
        `SELECT id, album_id, name, title, message, photo_url, video_url, sort_order, created_at FROM album_teachers
         WHERE album_id = ? ORDER BY sort_order ASC, created_at ASC`
      )
      .bind(albumId)
      .all<Record<string, unknown>>()
    const list = teachers ?? []
    if (list.length > 0) {
      const teacherIds = list.map((t) => t.id as string)
      const ph = teacherIds.map(() => '?').join(',')
      const { results: photos } = await db
        .prepare(
          `SELECT id, teacher_id, file_url, sort_order FROM album_teacher_photos WHERE teacher_id IN (${ph}) ORDER BY sort_order ASC`
        )
        .bind(...teacherIds)
        .all<Record<string, unknown>>()
      const photosByTeacher: Record<string, Record<string, unknown>[]> = {}
      for (const p of photos ?? []) {
        const tid = p.teacher_id as string
        if (!photosByTeacher[tid]) photosByTeacher[tid] = []
        photosByTeacher[tid].push(p)
      }
      list.forEach((teacher) => {
        ;(teacher as Record<string, unknown>).photos = photosByTeacher[teacher.id as string] || []
      })
    }
    return c.json(list)
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// POST /api/albums/:id/teachers
albumsIdTeachers.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const albumId = c.req.param('id')
    const body = await c.req.json()
    const { name, title } = body
    if (!name || !name.trim()) {
      return c.json({ error: 'Nama guru harus diisi' }, 400)
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const isGlobalAdmin = (await getRole(c, user)) === 'admin'
    if (!isGlobalAdmin) {
      const album = await db
        .prepare(`SELECT user_id FROM albums WHERE id = ?`)
        .bind(albumId)
        .first<{ user_id: string }>()
      if (!album) {
        return c.json({ error: 'Album not found' }, 404)
      }
      const isOwner = album.user_id === user.id
      if (!isOwner) {
        const member = await db
          .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
          .bind(albumId, user.id)
          .first<{ role: string }>()
        if (!member || member.role !== 'admin') {
          return c.json({ error: 'Forbidden' }, 403)
        }
      }
    }
    const lastTeacher = await db
      .prepare(
        `SELECT sort_order FROM album_teachers WHERE album_id = ? ORDER BY sort_order DESC LIMIT 1`
      )
      .bind(albumId)
      .first<{ sort_order: number | null }>()
    const nextSortOrder = (lastTeacher?.sort_order ?? -1) + 1
    const tid = crypto.randomUUID()
    const ins = await db
      .prepare(
        `INSERT INTO album_teachers (id, album_id, name, title, sort_order, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(tid, albumId, name.trim(), title?.trim() || null, nextSortOrder, user.id)
      .run()
    if (!ins.success) return c.json({ error: 'Insert failed' }, 500)
    const row = await db.prepare(`SELECT * FROM album_teachers WHERE id = ?`).bind(tid).first()
    return c.json(row, 201)
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default albumsIdTeachers
