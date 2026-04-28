import { Hono } from 'hono'
import { getD1 } from '../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../middleware'

async function checkIsAdmin(c: import('hono').Context, userId: string): Promise<boolean> {
  const db = getD1(c)
  if (!db) return false
  const row = await db
    .prepare(`SELECT role FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ role: string }>()
  return row?.role === 'admin'
}

function normalizeCode(raw: unknown): string {
  return String(raw ?? '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '')
}

function isExpired(expiresAt: unknown): boolean {
  if (!expiresAt) return false
  const d = new Date(String(expiresAt))
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

const discountVouchers = new Hono<AppEnv>()

// Public: validate voucher code (no auth, no mutation)
discountVouchers.post('/validate', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const body = await c.req.json().catch(() => ({} as any))
  const code = normalizeCode(body?.code)
  if (!code) return c.json({ error: 'Kode voucher harus diisi.' }, 400)

  const row = await db
    .prepare(`SELECT * FROM discount_vouchers WHERE code = ?`)
    .bind(code)
    .first<Record<string, unknown>>()
  if (!row) return c.json({ error: 'Kode voucher tidak ditemukan.' }, 404)

  const active = Number(row.is_active) === 1
  if (!active) return c.json({ error: 'Kode voucher sudah tidak aktif.' }, 410)
  if (isExpired(row.expires_at)) return c.json({ error: 'Kode voucher sudah kadaluarsa.' }, 410)

  const usedCount = Number(row.used_count ?? 0)
  const maxUses = Number(row.max_uses ?? 1)
  if (Number.isFinite(maxUses) && usedCount >= maxUses) {
    return c.json({ error: 'Kode voucher sudah mencapai batas pemakaian.' }, 410)
  }

  const percentOff = Number(row.percent_off)
  if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
    return c.json({ error: 'Voucher tidak valid.' }, 400)
  }

  return c.json({
    ok: true,
    code,
    percent_off: percentOff,
  })
})

// Admin-only CRUD
discountVouchers.use('*', requireAuthJwt)

discountVouchers.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = c.get('user')
  if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)
  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const { results } = await db
    .prepare(`SELECT * FROM discount_vouchers ORDER BY created_at DESC`)
    .all<Record<string, unknown>>()
  return c.json(results ?? [])
})

discountVouchers.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = c.get('user')
  if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)
  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({} as any))
  const code = normalizeCode(body?.code)
  const percentOff = Number(body?.percent_off)
  const maxUses = body?.max_uses === undefined || body?.max_uses === null ? 1 : Number(body?.max_uses)
  const expiresAt = body?.expires_at ? String(body.expires_at) : null

  if (!code) return c.json({ error: 'Kode voucher harus diisi.' }, 400)
  if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
    return c.json({ error: 'Persen diskon harus 1–100.' }, 400)
  }
  if (!Number.isFinite(maxUses) || maxUses < 1) return c.json({ error: 'Max uses minimal 1.' }, 400)

  const id = crypto.randomUUID()
  try {
    await db
      .prepare(
        `INSERT INTO discount_vouchers (id, code, percent_off, max_uses, used_count, is_active, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'))`
      )
      .bind(id, code, Math.round(percentOff), Math.round(maxUses), expiresAt)
      .run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return c.json({ error: 'Kode sudah ada, gunakan kode lain.' }, 409)
    }
    return c.json({ error: msg }, 500)
  }

  const row = await db.prepare(`SELECT * FROM discount_vouchers WHERE id = ?`).bind(id).first()
  return c.json(row, 201)
})

discountVouchers.put('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = c.get('user')
  if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)
  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({} as any))
  const id = String(body?.id ?? '')
  if (!id) return c.json({ error: 'ID required' }, 400)

  const sets: string[] = []
  const vals: unknown[] = []

  if (body?.percent_off !== undefined) {
    const p = Number(body.percent_off)
    if (!Number.isFinite(p) || p < 1 || p > 100) return c.json({ error: 'Persen diskon harus 1–100.' }, 400)
    sets.push('percent_off = ?')
    vals.push(Math.round(p))
  }
  if (body?.max_uses !== undefined) {
    const m = Number(body.max_uses)
    if (!Number.isFinite(m) || m < 1) return c.json({ error: 'Max uses minimal 1.' }, 400)
    sets.push('max_uses = ?')
    vals.push(Math.round(m))
  }
  if (body?.is_active !== undefined) {
    const active = body.is_active ? 1 : 0
    sets.push('is_active = ?')
    vals.push(active)
  }
  if (body?.expires_at !== undefined) {
    sets.push('expires_at = ?')
    vals.push(body.expires_at || null)
  }

  if (sets.length === 0) return c.json({ error: 'No fields' }, 400)
  sets.push(`updated_at = datetime('now')`)
  vals.push(id)

  const r = await db
    .prepare(`UPDATE discount_vouchers SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
  const row = await db.prepare(`SELECT * FROM discount_vouchers WHERE id = ?`).bind(id).first()
  return c.json(row)
})

discountVouchers.delete('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = c.get('user')
  if (!user?.id) return c.json({ error: 'Unauthorized' }, 401)
  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({} as any))
  const id = String(body?.id ?? '')
  if (!id) return c.json({ error: 'ID required' }, 400)

  const r = await db.prepare(`DELETE FROM discount_vouchers WHERE id = ?`).bind(id).run()
  if (!r.success) return c.json({ error: 'Delete failed' }, 500)
  return c.json({ ok: true })
})

export default discountVouchers

