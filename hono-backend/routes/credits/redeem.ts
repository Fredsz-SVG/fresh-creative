import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { deductCreditsFromSupabaseAndMirrorToD1, getCreditsFromSupabase, mirrorCreditsToD1, setCreditsInSupabase } from '../../lib/credits'

async function checkIsAdmin(c: import('hono').Context, userId: string): Promise<boolean> {
  const db = getD1(c)
  if (!db) return false
  const row = await db.prepare(`SELECT role FROM users WHERE id = ?`).bind(userId).first<{ role: string }>()
  return row?.role === 'admin'
}

const creditsRedeem = new Hono()

// GET: list redeem codes (admin)
creditsRedeem.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const { results: codes } = await db
    .prepare(`SELECT * FROM redeem_codes ORDER BY created_at DESC`)
    .all<Record<string, unknown>>()
  const codeList = codes ?? []
  const ids = codeList.map((r) => r.id as string).filter(Boolean)
  let historyByCode = new Map<string, Record<string, unknown>[]>()
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',')
    const { results: hist } = await db
      .prepare(
        `SELECT id, redeem_code_id, user_id, credits_received, redeemed_at FROM redeem_history WHERE redeem_code_id IN (${ph})`
      )
      .bind(...ids)
      .all<Record<string, unknown>>()
    historyByCode = new Map()
    for (const h of hist ?? []) {
      const cid = h.redeem_code_id as string
      const arr = historyByCode.get(cid) ?? []
      arr.push(h)
      historyByCode.set(cid, arr)
    }
  }
  const data = codeList.map((row) => ({
    ...row,
    redeem_history: historyByCode.get(row.id as string) ?? [],
  }))
  return c.json(data)
})

// POST: create redeem code (admin) OR redeem code (user)
creditsRedeem.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({}))
  const { action } = body

  if (action === 'redeem') {
    const code = body.code
    if (!code || !String(code).trim()) return c.json({ error: 'Kode redeem harus diisi.' }, 400)

    const cleanCode = String(code).toUpperCase().trim()

    const redeemCode = await db
      .prepare(`SELECT * FROM redeem_codes WHERE code = ?`)
      .bind(cleanCode)
      .first<Record<string, unknown>>()

    if (!redeemCode) return c.json({ error: 'Kode tidak ditemukan.' }, 404)
    if (!redeemCode.is_active) return c.json({ error: 'Kode sudah tidak aktif.' }, 410)
    if (redeemCode.expires_at && new Date(redeemCode.expires_at as string) < new Date()) {
      return c.json({ error: 'Kode sudah kadaluarsa.' }, 410)
    }
    if ((redeemCode.used_count as number) >= (redeemCode.max_uses as number)) {
      return c.json({ error: 'Kode sudah mencapai batas pemakaian.' }, 410)
    }

    const existing = await db
      .prepare(`SELECT id FROM redeem_history WHERE redeem_code_id = ? AND user_id = ?`)
      .bind(redeemCode.id, user.id)
      .first<{ id: string }>()
    if (existing) return c.json({ error: 'Kamu sudah pernah menggunakan kode ini.' }, 409)

    const add = redeemCode.credits as number
    const currentCredits = await getCreditsFromSupabase(c.env as Record<string, string>, user.id).catch(async () => {
      const row = await db.prepare(`SELECT credits FROM users WHERE id = ?`).bind(user.id).first<{ credits: number | null }>()
      return row?.credits ?? 0
    })
    const newCredits = currentCredits + add
    await setCreditsInSupabase(c.env as Record<string, string>, user.id, newCredits)
    await mirrorCreditsToD1(db, user.id, newCredits)

    const histId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO redeem_history (id, redeem_code_id, user_id, credits_received, redeemed_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(histId, redeemCode.id, user.id, add)
      .run()

    await db
      .prepare(`UPDATE redeem_codes SET used_count = used_count + 1, updated_at = datetime('now') WHERE id = ?`)
      .bind(redeemCode.id)
      .run()

    return c.json({ ok: true, credits_received: add, credits_total: newCredits })
  }

  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const { code: newCode, credits, max_uses, expires_at } = body
  if (!newCode || typeof credits !== 'number' || credits <= 0) {
    return c.json({ error: 'Code and credits are required' }, 400)
  }

  const id = crypto.randomUUID()
  try {
    await db
      .prepare(
        `INSERT INTO redeem_codes (id, code, credits, max_uses, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(id, String(newCode).toUpperCase().trim(), credits, max_uses ?? 1, expires_at || null)
      .run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) {
      return c.json({ error: 'Kode sudah ada, gunakan kode lain.' }, 409)
    }
    return c.json({ error: msg }, 500)
  }
  const row = await db.prepare(`SELECT * FROM redeem_codes WHERE id = ?`).bind(id).first()
  return c.json(row, 201)
})

// PUT: update redeem code (admin)
creditsRedeem.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const { id, credits, max_uses, is_active, expires_at } = body
  if (!id) return c.json({ error: 'ID required' }, 400)

  const sets: string[] = []
  const vals: unknown[] = []
  if (typeof credits === 'number' && credits > 0) {
    sets.push('credits = ?')
    vals.push(credits)
  }
  if (typeof max_uses === 'number' && max_uses >= 1) {
    sets.push('max_uses = ?')
    vals.push(max_uses)
  }
  if (typeof is_active === 'boolean') {
    sets.push('is_active = ?')
    vals.push(is_active ? 1 : 0)
  }
  if (expires_at !== undefined) {
    sets.push('expires_at = ?')
    vals.push(expires_at || null)
  }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400)
  sets.push(`updated_at = datetime('now')`)
  vals.push(id)
  const r = await db
    .prepare(`UPDATE redeem_codes SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  if (r.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
  const row = await db.prepare(`SELECT * FROM redeem_codes WHERE id = ?`).bind(id).first()
  return c.json(row)
})

// DELETE: delete redeem code (admin)
creditsRedeem.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  if (!(await checkIsAdmin(c, user.id))) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const { id } = body
  if (!id) return c.json({ error: 'ID required' }, 400)

  const r = await db.prepare(`DELETE FROM redeem_codes WHERE id = ?`).bind(id).run()
  if (!r.success) return c.json({ error: 'Delete failed' }, 500)
  return c.json({ ok: true })
})

export default creditsRedeem
