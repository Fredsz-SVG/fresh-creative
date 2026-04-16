import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getD1 } from '../../../../lib/edge-env'

const myAccessRoute = new Hono()

myAccessRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const access = await db
    .prepare(
      `SELECT id, student_name, email, status, created_at, date_of_birth, instagram, message, video_url
       FROM album_class_access WHERE album_id = ? AND class_id = ? AND user_id = ?`
    )
    .bind(albumId, classId, user.id)
    .first<Record<string, unknown>>()

  if (!access) return c.json({ access: null })
  return c.json(access)
})

myAccessRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const access = await db
    .prepare(
      `SELECT id, user_id, status FROM album_class_access WHERE class_id = ? AND user_id = ? AND album_id = ?`
    )
    .bind(classId, user.id, albumId)
    .first<{ id: string; user_id: string; status: string }>()

  if (!access) return c.json({ error: 'Akses tidak ditemukan' }, 404)
  if (access.status !== 'approved')
    return c.json({ error: 'Hanya bisa menyunting setelah akses disetujui' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email =
    body?.email !== undefined
      ? typeof body.email === 'string'
        ? body.email.trim() || null
        : null
      : undefined
  const date_of_birth =
    body?.date_of_birth !== undefined
      ? typeof body.date_of_birth === 'string'
        ? body.date_of_birth.trim() || null
        : null
      : undefined
  const instagram =
    body?.instagram !== undefined
      ? typeof body.instagram === 'string'
        ? body.instagram.trim() || null
        : null
      : undefined
  const message =
    body?.message !== undefined
      ? typeof body.message === 'string'
        ? body.message.trim() || null
        : null
      : undefined
  const video_url =
    body?.video_url !== undefined
      ? typeof body.video_url === 'string'
        ? body.video_url.trim() || null
        : null
      : undefined

  if (
    student_name === undefined &&
    email === undefined &&
    date_of_birth === undefined &&
    instagram === undefined &&
    message === undefined &&
    video_url === undefined
  ) {
    return c.json(
      {
        error:
          'Minimal satu field required (student_name, email, date_of_birth, instagram, message, video_url)',
      },
      400
    )
  }
  const sets: string[] = []
  const vals: unknown[] = []
  if (student_name !== undefined) {
    sets.push('student_name = ?')
    vals.push(student_name)
  }
  if (email !== undefined) {
    sets.push('email = ?')
    vals.push(email)
  }
  if (date_of_birth !== undefined) {
    sets.push('date_of_birth = ?')
    vals.push(date_of_birth)
  }
  if (instagram !== undefined) {
    sets.push('instagram = ?')
    vals.push(instagram)
  }
  if (message !== undefined) {
    sets.push('message = ?')
    vals.push(message)
  }
  if (video_url !== undefined) {
    sets.push('video_url = ?')
    vals.push(video_url)
  }
  sets.push(`updated_at = datetime('now')`)
  vals.push(access.id)

  const r = await db
    .prepare(`UPDATE album_class_access SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)

  const updated = await db
    .prepare(`SELECT * FROM album_class_access WHERE id = ?`)
    .bind(access.id)
    .first()
  return c.json(updated)
})

myAccessRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const access = await db
    .prepare(
      `SELECT id, status FROM album_class_access WHERE class_id = ? AND user_id = ? AND album_id = ?`
    )
    .bind(classId, user.id, albumId)
    .first<{ id: string; status: string }>()

  if (!access) return c.json({ error: 'Akses tidak ditemukan' }, 404)

  const del = await db.prepare(`DELETE FROM album_class_access WHERE id = ?`).bind(access.id).run()
  if (!del.success) return c.json({ error: 'Delete failed' }, 500)

  await db
    .prepare(`DELETE FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, user.id)
    .run()

  return c.json({ success: true })
})

export default myAccessRoute
