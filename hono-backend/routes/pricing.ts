import { Hono } from 'hono'
import { getD1 } from '../lib/edge-env'

const pricing = new Hono()

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
  try {
    const { results } = await db.prepare('SELECT * FROM pricing_packages ORDER BY id').all<Record<string, unknown>>()
    return c.json((results ?? []).map(parsePkg))
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
  const min_students = Number(body.min_students)
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
  const min_students = Number(body.min_students)
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
    return c.json({ message: 'Package deleted successfully' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

export default pricing
