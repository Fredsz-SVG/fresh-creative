import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1 } from '../../../../lib/edge-env'
import { parseJsonArray } from '../../../../lib/d1-json'

const albumClasses = new Hono()

// Mounted at `/api/albums/:id/classes` in `hono-backend/index.ts`, so handlers should use `/`.
albumClasses.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const classesRes = await db
    .prepare(
      `SELECT id, name, sort_order, batch_photo_url FROM album_classes WHERE album_id = ? ORDER BY sort_order ASC`
    )
    .bind(albumId)
    .all<{ id: string; name: string; sort_order: number; batch_photo_url: string | null }>()

  const classList = classesRes.results ?? []
  const accessRes = await db
    .prepare(`SELECT class_id, photos FROM album_class_access WHERE album_id = ?`)
    .bind(albumId)
    .all<{ class_id: string; photos: string }>()

  const studentCounts: Record<string, number> = {}
  for (const r of accessRes.results ?? []) {
    const photos = parseJsonArray(r.photos)
    if (photos.length > 0) {
      studentCounts[r.class_id] = (studentCounts[r.class_id] ?? 0) + 1
    }
  }

  const withCount = classList.map((cl) => ({
    id: cl.id,
    name: cl.name,
    sort_order: cl.sort_order,
    batch_photo_url: cl.batch_photo_url,
    student_count: studentCounts[cl.id] ?? 0,
  }))
  return c.json(withCount)
})

albumClasses.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can add class' }, 403)
  }

  const body = await c.req.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return c.json({ error: 'Class name is required' }, 400)

  const existing = await db
    .prepare(`SELECT id FROM album_classes WHERE album_id = ? AND name = ?`)
    .bind(albumId, name)
    .first<{ id: string }>()
  if (existing) return c.json({ error: 'Class with this name already exists' }, 400)

  const cnt = await db
    .prepare(`SELECT COUNT(*) as n FROM album_classes WHERE album_id = ?`)
    .bind(albumId)
    .first<{ n: number }>()
  const sort_order = cnt?.n ?? 0

  const id = crypto.randomUUID()
  try {
    await db
      .prepare(
        `INSERT INTO album_classes (id, album_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(id, albumId, name, sort_order)
      .run()
  } catch (e: any) {
    const msg = String(e?.message ?? e)
    const isDuplicate = /UNIQUE constraint|duplicate/i.test(msg)
    if (isDuplicate) {
      return c.json({ error: 'Kelas dengan nama ini sudah ada di album ini' }, 400)
    }
    return c.json({ error: msg }, 500)
  }

  const created = await db
    .prepare(`SELECT id, name, sort_order, album_id, created_at FROM album_classes WHERE id = ?`)
    .bind(id)
    .first()
  return c.json(created)
})

export default albumClasses
