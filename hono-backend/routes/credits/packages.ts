import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'

const creditsPackages = new Hono()

function mapCredit(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    credits: row.credits,
    price: row.price,
    popular: Number(row.popular) === 1,
    created_at: row.created_at,
  }
}

// GET /api/credits/packages — D1 (edge)
creditsPackages.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  try {
    const { results } = await db
      .prepare('SELECT * FROM credit_packages ORDER BY price ASC')
      .all<Record<string, unknown>>()
    return c.json((results ?? []).map(mapCredit))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

creditsPackages.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID()
  const credits = Number(body.credits)
  const price = Number(body.price)
  const popular = body.popular ? 1 : 0
  const name = body.name != null ? String(body.name) : null
  if (!Number.isFinite(credits) || !Number.isFinite(price)) {
    return c.json({ error: 'Invalid payload' }, 400)
  }
  try {
    await db
      .prepare(
        'INSERT INTO credit_packages (id, name, credits, price, popular) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(id, name, credits, price, popular)
      .run()
    const row = await db
      .prepare('SELECT * FROM credit_packages WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    return c.json(row ? mapCredit(row) : { id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

creditsPackages.put('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = body.id
  if (!id) return c.json({ error: 'ID is required' }, 400)
  const credits = Number(body.credits)
  const price = Number(body.price)
  const popular = body.popular ? 1 : 0
  try {
    const r = await db
      .prepare('UPDATE credit_packages SET credits = ?, price = ?, popular = ? WHERE id = ?')
      .bind(credits, price, popular, id)
      .run()
    if (r.meta.changes === 0) return c.json({ error: 'No rows updated' }, 404)
    const row = await db
      .prepare('SELECT * FROM credit_packages WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()
    return c.json(row ? mapCredit(row) : {})
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

creditsPackages.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'D1 tidak terkonfigurasi' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const id = body.id
  if (!id) return c.json({ error: 'ID is required' }, 400)
  try {
    const r = await db.prepare('DELETE FROM credit_packages WHERE id = ?').bind(id).run()
    if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
    return c.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error'
    return c.json({ error: msg }, 500)
  }
})

export default creditsPackages
