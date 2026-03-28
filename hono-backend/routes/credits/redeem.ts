import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

async function checkIsAdmin(userId: string, c: any) {
  const admin = getAdminSupabaseClient(c?.env as any)
  const { data } = await admin.from('users').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

const creditsRedeem = new Hono()

// GET: list redeem codes (admin)
creditsRedeem.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const adminCheck = await checkIsAdmin(user.id, c)
  if (!adminCheck) return c.json({ error: 'Forbidden' }, 403)

  const admin = getAdminSupabaseClient(c?.env as any)
  const { data, error } = await admin
    .from('redeem_codes')
    .select('*, redeem_history(id, user_id, credits_received, redeemed_at)')
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data ?? [])
})

// POST: create redeem code (admin) OR redeem code (user)
creditsRedeem.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({}))
  const { action } = body

  if (action === 'redeem') {
    // User redeeming a code
    const code = body.code
    if (!code || !code.trim()) return c.json({ error: 'Kode redeem harus diisi.' }, 400)

    const admin = getAdminSupabaseClient(c?.env as any)
    const cleanCode = code.toUpperCase().trim()

    const { data: redeemCode, error: findErr } = await admin
      .from('redeem_codes').select('*').eq('code', cleanCode).maybeSingle()

    if (findErr) return c.json({ error: findErr.message }, 500)
    if (!redeemCode) return c.json({ error: 'Kode tidak ditemukan.' }, 404)
    if (!redeemCode.is_active) return c.json({ error: 'Kode sudah tidak aktif.' }, 410)
    if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
      return c.json({ error: 'Kode sudah kadaluarsa.' }, 410)
    }
    if (redeemCode.used_count >= redeemCode.max_uses) {
      return c.json({ error: 'Kode sudah mencapai batas pemakaian.' }, 410)
    }

    const { data: existing } = await admin
      .from('redeem_history').select('id').eq('redeem_code_id', redeemCode.id).eq('user_id', user.id).maybeSingle()
    if (existing) return c.json({ error: 'Kamu sudah pernah menggunakan kode ini.' }, 409)

    const { data: userRow } = await admin.from('users').select('credits').eq('id', user.id).single()
    const currentCredits = userRow?.credits ?? 0
    const newCredits = currentCredits + redeemCode.credits

    const { error: updateErr } = await admin.from('users').update({ credits: newCredits }).eq('id', user.id)
    if (updateErr) return c.json({ error: 'Gagal menambah credit.' }, 500)

    await admin.from('redeem_history').insert({
      redeem_code_id: redeemCode.id, user_id: user.id, credits_received: redeemCode.credits,
    })
    await admin.from('redeem_codes').update({ used_count: redeemCode.used_count + 1 }).eq('id', redeemCode.id)

    return c.json({ ok: true, credits_received: redeemCode.credits, credits_total: newCredits })
  }

  // Admin creating a new code
  const adminCheck = await checkIsAdmin(user.id, c)
  if (!adminCheck) return c.json({ error: 'Forbidden' }, 403)

  const { code: newCode, credits, max_uses, expires_at } = body
  if (!newCode || typeof credits !== 'number' || credits <= 0) {
    return c.json({ error: 'Code and credits are required' }, 400)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const { data, error } = await admin
    .from('redeem_codes')
    .insert({ code: newCode.toUpperCase().trim(), credits, max_uses: max_uses ?? 1, expires_at: expires_at || null })
    .select()

  if (error) {
    if (error.code === '23505') return c.json({ error: 'Kode sudah ada, gunakan kode lain.' }, 409)
    return c.json({ error: error.message }, 500)
  }
  return c.json(data[0], 201)
})

// PUT: update redeem code (admin)
creditsRedeem.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const adminCheck = await checkIsAdmin(user.id, c)
  if (!adminCheck) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const { id, credits, max_uses, is_active, expires_at } = body
  if (!id) return c.json({ error: 'ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const updateObj: Record<string, any> = {}
  if (typeof credits === 'number' && credits > 0) updateObj.credits = credits
  if (typeof max_uses === 'number' && max_uses >= 1) updateObj.max_uses = max_uses
  if (typeof is_active === 'boolean') updateObj.is_active = is_active
  if (expires_at !== undefined) updateObj.expires_at = expires_at || null

  const { data, error } = await admin.from('redeem_codes').update(updateObj).eq('id', id).select()
  if (error) return c.json({ error: error.message }, 500)
  if (!data?.length) return c.json({ error: 'Not found' }, 404)
  return c.json(data[0])
})

// DELETE: delete redeem code (admin)
creditsRedeem.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const adminCheck = await checkIsAdmin(user.id, c)
  if (!adminCheck) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const { id } = body
  if (!id) return c.json({ error: 'ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const { error } = await admin.from('redeem_codes').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default creditsRedeem