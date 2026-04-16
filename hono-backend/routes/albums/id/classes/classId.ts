import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1 } from '../../../../lib/edge-env'

const classIdRoute = new Hono()

classIdRoute.delete('/', async (c) => {
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

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()

  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can delete class' }, 403)
  }

  const cls = await db
    .prepare(`SELECT id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string }>()

  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const del = await db.prepare(`DELETE FROM album_classes WHERE id = ?`).bind(classId).run()
  if (!del.success) return c.json({ error: 'Delete failed' }, 500)
  return c.json({ message: 'Class deleted' })
})

classIdRoute.patch('/', async (c) => {
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

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()

  if (!album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can update class' }, 403)
  }

  const cls = await db
    .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string; album_id: string }>()

  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const sort_order = body?.sort_order !== undefined ? Number(body.sort_order) : undefined
  const batch_photo_url =
    typeof body?.batch_photo_url === 'string' ? body.batch_photo_url : undefined

  const updates: string[] = []
  const vals: unknown[] = []
  if (name !== undefined) {
    if (!name) return c.json({ error: 'Class name is required' }, 400)
    const existing = await db
      .prepare(`SELECT id FROM album_classes WHERE album_id = ? AND name = ? AND id != ?`)
      .bind(albumId, name, classId)
      .first<{ id: string }>()
    if (existing) return c.json({ error: 'Class with this name already exists' }, 400)
    updates.push('name = ?')
    vals.push(name)
  }
  if (sort_order !== undefined && !Number.isNaN(sort_order)) {
    updates.push('sort_order = ?')
    vals.push(sort_order)
  }
  if (batch_photo_url !== undefined) {
    updates.push('batch_photo_url = ?')
    vals.push(batch_photo_url)
  }

  if (updates.length === 0) {
    const current = await db
      .prepare(`SELECT id, name, sort_order, batch_photo_url FROM album_classes WHERE id = ?`)
      .bind(classId)
      .first()
    return c.json(current ?? {}, 200)
  }

  vals.push(classId)
  const sql = `UPDATE album_classes SET ${updates.join(', ')} WHERE id = ?`
  const r = await db
    .prepare(sql)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)

  const updated = await db
    .prepare(`SELECT id, name, sort_order, batch_photo_url FROM album_classes WHERE id = ?`)
    .bind(classId)
    .first()
  return c.json(updated)
})

export default classIdRoute
