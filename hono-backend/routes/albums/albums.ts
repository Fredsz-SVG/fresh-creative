import { Hono } from 'hono'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { isSimilarSchoolName } from '../../lib/school-name-utils'
import { requireAuthJwt, getAuthUserId } from '../../middleware'

const albumColsUser =
  `a.id, a.user_id, a.name, a.type, a.status, a.created_at, a.cover_image_url, a.pricing_package_id, a.payment_status, a.payment_url, a.total_estimated_price, p.name as pricing_pkg_name`

function mapAlbumRow(r: Record<string, unknown>) {
  const pkg = r.pricing_pkg_name
    ? { name: r.pricing_pkg_name }
    : null
  const rest = { ...r }
  delete (rest as { pricing_pkg_name?: unknown }).pricing_pkg_name
  return { ...rest, pricing_packages: pkg }
}

const albumsRoute = new Hono()
albumsRoute.use('*', requireAuthJwt)

albumsRoute.get('/', async (c) => {
  try {
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const userId = await getAuthUserId(c)
    if (!userId) {
      return c.json([])
    }

    let role: 'admin' | 'user' = 'user'
    try {
      role = await getRole(c, { id: userId })
    } catch {
      /* ignore */
    }
    const isAdmin = role === 'admin'
    const scope = c.req.query('scope')
    const shouldUseAdminScope = isAdmin && scope !== 'mine'

    if (shouldUseAdminScope) {
      const { results } = await db
        .prepare(
          `SELECT a.id, a.name, a.type, a.status, a.created_at, a.pricing_package_id, a.school_city, a.kab_kota, a.wa_e164, a.province_id, a.province_name, a.pic_name, a.students_count, a.source, a.total_estimated_price, a.payment_status, a.payment_url,
            p.name as pricing_pkg_name
           FROM albums a
           LEFT JOIN pricing_packages p ON a.pricing_package_id = p.id
           ORDER BY a.created_at DESC`
        )
        .all<Record<string, unknown>>()

      const rows = results ?? []
      const result = rows.map((a) => {
        const m = mapAlbumRow(a)
        return { ...m, isOwner: false }
      })
      return c.json(result)
    }

    const rows = await db
      .prepare(
        `SELECT ${albumColsUser},
            CASE WHEN a.user_id = ? THEN 1 ELSE 0 END AS is_owner,
            CASE
              WHEN a.user_id = ? THEN 0
              WHEN EXISTS (
                SELECT 1 FROM album_members am
                WHERE am.album_id = a.id AND am.user_id = ?
              ) THEN 1
              WHEN EXISTS (
                SELECT 1 FROM album_class_access aca
                WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved'
              ) THEN 2
              ELSE 3
            END AS access_rank
          FROM albums a
          LEFT JOIN pricing_packages p ON a.pricing_package_id = p.id
          WHERE a.user_id = ?
             OR EXISTS (
               SELECT 1 FROM album_members am
               WHERE am.album_id = a.id AND am.user_id = ?
             )
             OR EXISTS (
               SELECT 1 FROM album_class_access aca
               WHERE aca.album_id = a.id AND aca.user_id = ? AND aca.status = 'approved'
             )
          ORDER BY a.created_at DESC`
      )
      .bind(userId, userId, userId, userId, userId, userId, userId)
      .all<Record<string, unknown>>()

    const result = (rows.results ?? []).map((raw) => {
      const mapped = mapAlbumRow(raw)
      const isOwner = Number(raw.is_owner ?? 0) === 1
      const accessRank = Number(raw.access_rank ?? 3)
      const response: Record<string, unknown> & { isOwner: boolean } = {
        ...mapped,
        isOwner,
      }
      if (!isOwner && accessRank === 2) {
        response.status = 'approved'
      }
      delete (response as Record<string, unknown>).is_owner
      delete (response as Record<string, unknown>).access_rank
      return response
    })

    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/albums]', err)
    return c.json({ error: message })
  }
})

albumsRoute.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const userId = await getAuthUserId(c)
  if (!userId) {
    return c.json({ error: 'Unauthorized. Please login.' }, 401)
  }

  await ensureUserInD1(db, { id: userId, email: '' }, honoEnvForSupabasePublicSync(c.env))

  let body: Record<string, unknown>
  try {
    const parsed = await c.req.json().catch(() => null)
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const type = typeof body.type === 'string' ? body.type : 'yearbook'
  const name = typeof body.name === 'string' ? body.name : ''
  const school_name = typeof body.school_name === 'string' ? body.school_name : ''
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const baseInsert: Record<string, unknown> = {
    id,
    user_id: userId,
    type,
    status: 'pending',
    created_at: now,
    updated_at: now,
  }

  if (type === 'yearbook') {
    const finalName = (school_name || name || '').trim()
    if (!finalName) {
      return c.json({ error: 'Nama sekolah wajib.' }, 400)
    }

    const SCHOOL_NAME_REGEX = /^(SMAN|SMKN|SMK|SMA|MAN|MA|SMPN|SMP|MTsN|MTs|SDN|SD|MIN|MI)\s+\d+\s+.{2,}$/i
    if (!SCHOOL_NAME_REGEX.test(finalName)) {
      return c.json(
        {
          error:
            'Format nama sekolah harus seperti: SMAN 1 Salatiga, SMKN 2 Bandung, dst.',
        },
        400
      )
    }

    const dupRows = await db
      .prepare(`SELECT id, name, pic_name, wa_e164 FROM albums WHERE type = 'yearbook'`)
      .all<{ name: string | null; pic_name: string | null; wa_e164: string | null }>()

    for (const album of dupRows.results ?? []) {
      if (isSimilarSchoolName(finalName, album.name || '')) {
        const contact = [album.pic_name, album.wa_e164].filter(Boolean).join(' - ')
        return c.json(
          {
            error: `Nama sekolah "${finalName}" mirip dengan "${album.name}" yang sudah terdaftar.${contact ? ` Hubungi ${contact} untuk informasi lebih lanjut.` : ''}`,
          },
          409
        )
      }
    }

    Object.assign(baseInsert, {
      name: finalName,
      school_city: body.school_city ?? null,
      kab_kota: body.kab_kota ?? null,
      wa_e164: body.wa_e164 ?? null,
      province_id: body.province_id ?? null,
      province_name: body.province_name ?? null,
      pic_name: body.pic_name ?? null,
      students_count: body.students_count ?? null,
      source: body.source || 'showroom',
      pricing_package_id: body.pricing_package_id ?? null,
      total_estimated_price: body.total_estimated_price ?? null,
    })
  } else if (type === 'public') {
    if (!name) {
      return c.json({ error: 'Nama album wajib.' }, 400)
    }
    Object.assign(baseInsert, {
      name,
      status: 'approved',
    })
  } else {
    return c.json({ error: 'Invalid type' }, 400)
  }

  const cols = Object.keys(baseInsert)
  const placeholders = cols.map(() => '?').join(', ')
  const sql = `INSERT INTO albums (${cols.join(', ')}) VALUES (${placeholders})`
  try {
    await db.prepare(sql).bind(...cols.map((k) => baseInsert[k])).run()
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Insert failed' }, 500)
  }

  const row = await db.prepare(`SELECT * FROM albums WHERE id = ?`).bind(id).first()
  return c.json(row)
})

// Admin approve/decline album
// Frontend (AlbumsView) memanggil: PUT /api/albums { id, status: 'approved'|'declined' }
albumsRoute.put('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  await ensureUserInD1(db, { id: userId, email: '' }, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, { id: userId })) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const { id, status } = body as Record<string, unknown>

  if (!id || typeof id !== 'string') return c.json({ error: 'Album ID is required' }, 400)
  if (status !== 'approved' && status !== 'declined') {
    return c.json({ error: 'status must be approved or declined' }, 400)
  }

  const r = await db
    .prepare(`UPDATE albums SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(status, id)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  if (r.meta.changes === 0) return c.json({ error: 'Album not found' }, 404)

  const row = await db.prepare(`SELECT * FROM albums WHERE id = ?`).bind(id).first<Record<string, unknown>>()
  return c.json(row)
})

albumsRoute.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({}))
  const { id } = body
  if (!id) return c.json({ error: 'Album ID is required' }, 400)

  const role = await getRole(c, { id: userId })

  if (role === 'admin') {
    const r = await db.prepare(`DELETE FROM albums WHERE id = ?`).bind(id).run()
    if (!r.success) return c.json({ error: 'Delete failed' }, 500)
  } else {
    const r = await db
      .prepare(`DELETE FROM albums WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run()
    if (!r.success || r.meta.changes === 0) {
      return c.json({ error: 'Album not found or forbidden' }, 403)
    }
  }

  return c.json({ message: 'Album deleted successfully' })
})

export default albumsRoute
