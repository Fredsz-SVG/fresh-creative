import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'

const selectArea = new Hono()

async function provincesFromD1(
  db: D1Database,
  qRaw: string
): Promise<{ id: string; name: string }[]> {
  if (qRaw) {
    const like = `%${qRaw}%`
    const { results } = await db
      .prepare('SELECT id, name FROM ref_provinces WHERE name_lower LIKE ? ORDER BY name LIMIT 100')
      .bind(like)
      .all<{ id: string; name: string }>()
    return results ?? []
  }
  const { results } = await db
    .prepare('SELECT id, name FROM ref_provinces ORDER BY name LIMIT 100')
    .all<{ id: string; name: string }>()
  return results ?? []
}

async function citiesFromD1(
  db: D1Database,
  province_id: string,
  kind: string,
  cleanQ: string,
  limit: number
): Promise<{ id: string; province_id: string; name: string; kind: string }[]> {
  let sql = 'SELECT id, province_id, name, kind FROM ref_cities WHERE province_id = ?'
  const binds: (string | number)[] = [province_id]
  if (kind === 'kota' || kind === 'kabupaten') {
    sql += ' AND kind = ?'
    binds.push(kind)
  }
  if (cleanQ) {
    sql += ' AND name_lower LIKE ?'
    binds.push(`%${cleanQ}%`)
  }
  sql += ' ORDER BY name LIMIT ?'
  binds.push(limit)
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<{
      id: string
      province_id: string
      name: string
      kind: string
    }>()
  return results ?? []
}

// GET /api/select-area?type=provinces|cities&...params — data dari D1 (ref_*).
selectArea.get('/', async (c) => {
  try {
    const q = c.req.query()
    const type = (q?.type ?? '').trim().toLowerCase()
    const db = (c.env as { DB?: D1Database }).DB
    if (!db) {
      return c.json({ ok: false, error: 'Database (D1) tidak terkonfigurasi' }, 503)
    }

    if (type === 'provinces') {
      const qRaw = (q?.q ?? '').trim().toLowerCase()
      const data = await provincesFromD1(db, qRaw)
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return c.json({ ok: true, data })
    }

    if (type === 'cities') {
      const province_id = (q?.province_id ?? '').trim()
      if (!province_id) return c.json({ ok: false, error: 'province_id is required' }, 400)
      const qRaw = (q?.q ?? '').trim().toLowerCase()
      const kind = (q?.kind ?? '').trim().toLowerCase()
      const limit = Math.min(Number(q?.limit ?? '100') || 100, 300)
      const cleanQ = qRaw
        .replace(/^kota\s+/, '')
        .replace(/^kabupaten\s+/, '')
        .replace(/^kab\s+/, '')
        .trim()

      const data = await citiesFromD1(db, province_id, kind, cleanQ, limit)
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return c.json({ ok: true, data })
    }

    return c.json({ ok: false, error: 'type parameter required: "provinces" or "cities"' }, 400)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return c.json({ ok: false, error: msg }, 500)
  }
})

export default selectArea
