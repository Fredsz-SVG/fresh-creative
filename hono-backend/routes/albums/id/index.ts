import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'
import { parseJsonArray } from '../../../lib/d1-json'

const albumIdRoute = new Hono()

// Mounted at `/api/albums/:id` in `hono-backend/index.ts`, so handlers should use `/`.
albumIdRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const authRes = await supabase.auth.getUser()
  const user = authRes.data?.user || null
  const id = c.req.param('id')
  if (!id) return c.json({ error: 'Album ID required' }, 400)

  try {
    const [row, role] = await Promise.all([
      db
        .prepare(
          `SELECT id, name, type, status, cover_image_url, cover_image_position, cover_video_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price, pricing_package_id, package_snapshot
           FROM albums WHERE id = ?`
        )
        .bind(id)
        .first<Record<string, unknown>>(),
      user ? getRole(c, user) : Promise.resolve('user' as const),
    ])

    if (!row) {
      return c.json({ error: 'Album not found' }, 404)
    }

    const isActualOwner = user ? row.user_id === user.id : false
    const isAdmin = role === 'admin'
    const isOwner = isActualOwner || isAdmin
    let isAlbumAdmin = false
    if (user && !isOwner && !isAdmin) {
      const member = await db
        .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
        .bind(id, user.id)
        .first<{ role: string }>()
      if (member) {
        if (member.role === 'admin') isAlbumAdmin = true
      } else {
        const approved = await db
          .prepare(
            `SELECT id FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
          )
          .bind(id, user.id)
          .first<{ id: string }>()
        if (!approved) {
          // If not approved and not owner, we can still show basic info for showcase
          // unless it's strictly private. For now, let's allow it for basic info.
          // return c.json({ error: 'Album not found' }, 404)
        }
      }
    }

    if (row.type !== 'yearbook') {
      return c.json({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        cover_image_url: row.cover_image_url ?? null,
        cover_image_position: row.cover_image_position ?? null,
        cover_video_url: row.cover_video_url ?? null,
        description: row.description ?? null,
        isOwner,
        classes: [],
      })
    }

    const classesRes = await db
      .prepare(
        `SELECT id, name, sort_order, batch_photo_url FROM album_classes WHERE album_id = ? ORDER BY sort_order ASC`
      )
      .bind(id)
      .all<{ id: string; name: string; sort_order: number; batch_photo_url: string | null }>()

    const classList = classesRes.results ?? []
    const studentCounts: Record<string, number> = {}

    const accessRes = await db
      .prepare(
        `SELECT class_id, status, photos, student_name FROM album_class_access WHERE album_id = ?`
      )
      .bind(id)
      .all<{
        class_id: string
        status: string
        photos: string
        student_name: string | null
      }>()

    const allAccess = accessRes.results ?? []
    for (const cl of classList) {
      const classMembers = allAccess.filter((a) => a.class_id === cl.id)
      const validMembers = classMembers.filter((a) => {
        const photos = parseJsonArray(a.photos)
        return a.status === 'approved' || photos.length > 0
      })
      const uniqueNames = new Set(validMembers.map((m) => m.student_name).filter(Boolean))
      studentCounts[cl.id] = uniqueNames.size
    }

    const classesWithCount = classList.map((cl) => ({
      id: cl.id,
      name: cl.name,
      sort_order: cl.sort_order,
      student_count: studentCounts[cl.id] ?? 0,
      batch_photo_url: cl.batch_photo_url,
    }))

    return c.json({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      cover_image_url: row.cover_image_url ?? null,
      cover_image_position: row.cover_image_position ?? null,
      cover_video_url: row.cover_video_url ?? null,
      description: row.description ?? null,
      flipbook_mode: (row.flipbook_mode as string) || 'manual',
      isOwner,
      isAlbumAdmin,
      isGlobalAdmin: isAdmin,
      payment_status: row.payment_status || 'unpaid',
      payment_url: row.payment_url || null,
      total_estimated_price: row.total_estimated_price || 0,
      pricing_package_id: row.pricing_package_id || null,
      package_snapshot: row.package_snapshot ? JSON.parse(row.package_snapshot as string) : null,
      classes: classesWithCount,
    })
  } finally {
    /* noop */
  }
})

albumIdRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const { data: authRes } = await supabase.auth.getUser()
  const user = authRes?.user || null
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  if (!id) return c.json({ error: 'Album ID required' }, 400)

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(id)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(c, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can update' }, 403)
  }

  const body = await c.req.json()
  const {
    cover_image_url,
    description,
    students_count,
    flipbook_mode,
    total_estimated_price,
    pricing_package_id,
  } = body as Record<string, unknown>

  const sets: string[] = []
  const vals: unknown[] = []
  if (cover_image_url !== undefined) {
    sets.push('cover_image_url = ?')
    vals.push(cover_image_url)
  }
  if (description !== undefined) {
    sets.push('description = ?')
    vals.push(description)
  }
  if (students_count !== undefined) {
    sets.push('students_count = ?')
    vals.push(students_count)
  }
  if (flipbook_mode !== undefined) {
    sets.push('flipbook_mode = ?')
    vals.push(flipbook_mode)
  }
  if (total_estimated_price !== undefined) {
    sets.push('total_estimated_price = ?')
    vals.push(total_estimated_price)
  }
  if (pricing_package_id !== undefined) {
    sets.push('pricing_package_id = ?')
    vals.push(pricing_package_id)
    if (pricing_package_id) {
      const pkg = await db
        .prepare(
          `SELECT name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features FROM pricing_packages WHERE id = ?`
        )
        .bind(pricing_package_id)
        .first<{
          name: string
          price_per_student: number
          min_students: number
          features: string
          flipbook_enabled: number
          ai_labs_features: string
        }>()
      if (pkg) {
        const snapshot = JSON.stringify({
          name: pkg.name,
          price_per_student: pkg.price_per_student,
          min_students: pkg.min_students,
          features: pkg.features,
          flipbook_enabled: pkg.flipbook_enabled === 1,
          ai_labs_features: JSON.parse(pkg.ai_labs_features || '[]'),
        })
        sets.push('package_snapshot = ?')
        vals.push(snapshot)
      }
    } else {
      sets.push('package_snapshot = ?')
      vals.push(null)
    }
  }
  if (sets.length === 0) return c.json(album, 400)

  vals.push(id)
  const sql = `UPDATE albums SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
  const r = await db
    .prepare(sql)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)

  const updated = await db.prepare(`SELECT * FROM albums WHERE id = ?`).bind(id).first()
  return c.json(updated)
})

export default albumIdRoute
