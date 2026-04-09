import { Hono } from 'hono'
import { getD1 } from '../lib/edge-env'
import { publishRealtimeEventFromContext } from '../lib/realtime'

const pricing = new Hono()
const PRICING_CACHE_TTL_MS = 30_000

let pricingCache: Array<Record<string, unknown>> | null = null
let pricingCacheExpiresAt = 0

function resetPricingCache() {
  pricingCache = null
  pricingCacheExpiresAt = 0
}

function parsePkg(row: Record<string, unknown>) {
  let features: unknown = []
  let aiLabs: unknown = []
  try {
    features = JSON.parse(String(row.features ?? '[]'))
  } catch {
    features = []
  }
  try {
    aiLabs = JSON.parse(String(row.ai_labs_features ?? '[]'))
  } catch {
    aiLabs = []
  }
  return {
    id: row.id,
    name: row.name,
    price_per_student: row.price_per_student,
    min_students: row.min_students,
    features,
    is_active: Number(row.is_active) === 1,
    flipbook_enabled: Number(row.flipbook_enabled) === 1,
    ai_labs_features: aiLabs,
    is_popular: Number(row.is_popular) === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// GET /api/pricing — D1 (edge), tanpa hop Postgres
pricing.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)

  const now = Date.now()
  if (pricingCache && now < pricingCacheExpiresAt) {
    c.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    c.header('X-Cache', 'HIT')
    return c.json(pricingCache)
  }

  try {
    const { results } = await db.prepare('SELECT * FROM pricing_packages ORDER BY id').all<Record<string, unknown>>()
    const parsed = (results ?? []).map(parsePkg)
    pricingCache = parsed
    pricingCacheExpiresAt = now + PRICING_CACHE_TTL_MS
    c.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    c.header('X-Cache', 'MISS')
    return c.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    console.error('Pricing Error:', err)
    return c.json({ error: msg }, 500)
  }
})

pricing.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID()
  const name = String(body.name ?? '')
  const price_per_student = Number(body.price_per_student)
  // min_students tidak lagi wajib dari UI admin; default 0.
  const min_students =
    body.min_students === undefined || body.min_students === null
      ? 0
      : Number(body.min_students)
  const features = JSON.stringify(body.features ?? [])
  const flipbook_enabled = body.flipbook_enabled ? 1 : 0
  const ai_labs_features = JSON.stringify(body.ai_labs_features ?? [])
  const is_popular = body.is_popular ? 1 : 0
  if (!name || !Number.isFinite(price_per_student) || !Number.isFinite(min_students)) {
    return c.json({ error: 'Invalid payload' }, 400)
  }
  try {
    await db
      .prepare(
        `INSERT INTO pricing_packages (id, name, price_per_student, min_students, features, is_active, flipbook_enabled, ai_labs_features, is_popular)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(id, name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular)
      .run()
    resetPricingCache()
    await publishRealtimeEventFromContext(c, {
      type: 'pricing.updated',
      channel: 'pricing',
      payload: { action: 'create', id },
      ts: new Date().toISOString(),
    })
    const row = await db.prepare('SELECT * FROM pricing_packages WHERE id = ?').bind(id).first<Record<string, unknown>>()
    return c.json(row ? parsePkg(row) : { id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

pricing.put('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = body.id
  if (!id) return c.json({ error: 'Package ID is required' }, 400)
  const name = String(body.name ?? '')
  const price_per_student = Number(body.price_per_student)
  // min_students tidak lagi wajib dari UI admin; default 0.
  const min_students =
    body.min_students === undefined || body.min_students === null
      ? 0
      : Number(body.min_students)
  const features = JSON.stringify(body.features ?? [])
  const flipbook_enabled = body.flipbook_enabled ? 1 : 0
  const ai_labs_features = JSON.stringify(body.ai_labs_features ?? [])
  const is_popular = body.is_popular ? 1 : 0
  try {
    const r = await db
      .prepare(
        `UPDATE pricing_packages SET name = ?, price_per_student = ?, min_students = ?, features = ?,
         flipbook_enabled = ?, ai_labs_features = ?, is_popular = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular, id)
      .run()
    if (r.meta.changes === 0) return c.json({ error: 'Package not found' }, 404)
    resetPricingCache()
    await publishRealtimeEventFromContext(c, {
      type: 'pricing.updated',
      channel: 'pricing',
      payload: { action: 'update', id },
      ts: new Date().toISOString(),
    })
    const row = await db.prepare('SELECT * FROM pricing_packages WHERE id = ?').bind(id).first<Record<string, unknown>>()
    return c.json(row ? [parsePkg(row)] : [])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

pricing.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = body.id
  if (!id) return c.json({ error: 'Package ID is required' }, 400)
  try {
    const r = await db.prepare('DELETE FROM pricing_packages WHERE id = ?').bind(id).run()
    if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    resetPricingCache()
    await publishRealtimeEventFromContext(c, {
      type: 'pricing.updated',
      channel: 'pricing',
      payload: { action: 'delete', id },
      ts: new Date().toISOString(),
    })
    return c.json({ message: 'Package deleted successfully' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

export default pricing
