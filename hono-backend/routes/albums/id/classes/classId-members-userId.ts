import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1 } from '../../../../lib/edge-env'

const classMemberUserRoute = new Hono()

classMemberUserRoute.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const albumId = c.req.param('id')
    const classId = c.req.param('classId')
    const userId = c.req.param('userId')
    if (!albumId || !classId || !userId) {
      return c.json({ error: 'Album ID, class ID, and user ID required' }, 400)
    }

    const album = await db
      .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ id: string; user_id: string }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const role = await getRole(c, user)
    const isOwner = album.user_id === user.id || role === 'admin'
    const memberRow = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    const isAlbumAdmin = memberRow?.role === 'admin'
    const canManage = isOwner || isAlbumAdmin

    if (!canManage && user.id !== userId) {
      return c.json({ error: 'Hanya owner/admin album atau diri sendiri yang bisa menghapus profil' }, 403)
    }

    const cls = await db
      .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ id: string; album_id: string }>()
    if (!cls) return c.json({ error: 'Class not found' }, 404)

    const access = await db
      .prepare(`SELECT id FROM album_class_access WHERE class_id = ? AND user_id = ?`)
      .bind(classId, userId)
      .first<{ id: string }>()
    if (!access) return c.json({ error: 'Member not found' }, 404)

    const del = await db.prepare(`DELETE FROM album_class_access WHERE id = ?`).bind(access.id).run()
    if (!del.success) return c.json({ error: 'Delete failed' }, 500)

    await db
      .prepare(`DELETE FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, userId)
      .run()

    const otherAccess = await db
      .prepare(`SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? LIMIT 1`)
      .bind(albumId, userId)
      .first<{ id: string }>()
    if (!otherAccess) {
      await db
        .prepare(`DELETE FROM album_members WHERE album_id = ? AND user_id = ?`)
        .bind(albumId, userId)
        .run()
    }

    return c.json({ success: true }, 200)
  } catch (err: unknown) {
    console.error('Error deleting member:', err)
    return c.json({ error: 'Server error' }, 500)
  }
})

classMemberUserRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  const userId = c.req.param('userId')
  if (!albumId || !classId || !userId) {
    return c.json({ error: 'Album ID, class ID, and user ID required' }, 400)
  }

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = album.user_id === user.id
  const memberRow = await db
    .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, user.id)
    .first<{ role: string }>()
  const isAlbumAdmin = memberRow?.role === 'admin'
  const canManage = isOwner || isAlbumAdmin
  const isEditingSelf = user.id === userId

  if (!isEditingSelf && !canManage)
    return c.json({ error: 'Hanya owner atau admin album yang bisa menyunting profil orang lain' }, 403)

  const access = await db
    .prepare(`SELECT id, status FROM album_class_access WHERE class_id = ? AND user_id = ?`)
    .bind(classId, userId)
    .first<{ id: string; status: string }>()
  if (!access) return c.json({ error: 'Profil tidak ditemukan' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email =
    body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined
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
    body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined
  const video_url =
    body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined

  if (
    student_name === undefined &&
    email === undefined &&
    date_of_birth === undefined &&
    instagram === undefined &&
    message === undefined &&
    video_url === undefined
  ) {
    return c.json({ error: 'Minimal satu field required' }, 400)
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

  const sql = `UPDATE album_class_access SET ${sets.join(', ')} WHERE id = ?`
  const r = await db.prepare(sql).bind(...vals).run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)

  const updated = await db.prepare(`SELECT * FROM album_class_access WHERE id = ?`).bind(access.id).first()
  return c.json(updated)
})

export default classMemberUserRoute
