import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

async function getUserFromRequest(request: any) {
  const supabase = getSupabaseClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function checkIsAdmin(userId: string) {
  const admin = getAdminSupabaseClient()
  const { data } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

async function handleRedeem(userId: string, code: string | undefined, reply: any) {
  if (!code || !code.trim()) {
    return reply.code(400).send({ error: 'Kode redeem harus diisi.' })
  }

  const admin = getAdminSupabaseClient()
  const cleanCode = code.toUpperCase().trim()

  const { data: redeemCode, error: findErr } = await admin
    .from('redeem_codes')
    .select('*')
    .eq('code', cleanCode)
    .maybeSingle()

  if (findErr) return reply.code(500).send({ error: findErr.message })
  if (!redeemCode) return reply.code(404).send({ error: 'Kode tidak ditemukan.' })
  if (!redeemCode.is_active) return reply.code(410).send({ error: 'Kode sudah tidak aktif.' })
  if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
    return reply.code(410).send({ error: 'Kode sudah kadaluarsa.' })
  }
  if (redeemCode.used_count >= redeemCode.max_uses) {
    return reply.code(410).send({ error: 'Kode sudah mencapai batas pemakaian.' })
  }

  const { data: existing } = await admin
    .from('redeem_history')
    .select('id')
    .eq('redeem_code_id', redeemCode.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return reply.code(409).send({ error: 'Kamu sudah pernah menggunakan kode ini.' })

  const { data: userRow } = await admin.from('users').select('credits').eq('id', userId).single()
  const currentCredits = userRow?.credits ?? 0
  const newCredits = currentCredits + redeemCode.credits

  const { error: updateErr } = await admin.from('users').update({ credits: newCredits }).eq('id', userId)
  if (updateErr) return reply.code(500).send({ error: 'Gagal menambah credit.' })

  await admin.from('redeem_history').insert({
    redeem_code_id: redeemCode.id, user_id: userId, credits_received: redeemCode.credits,
  })
  await admin.from('redeem_codes').update({ used_count: redeemCode.used_count + 1 }).eq('id', redeemCode.id)

  return reply.send({ ok: true, credits_received: redeemCode.credits, credits_total: newCredits })
}

async function handleCreate(body: any, reply: any) {
  const { code, credits, max_uses, expires_at } = body
  if (!code || typeof credits !== 'number' || credits <= 0) {
    return reply.code(400).send({ error: 'Code and credits are required' })
  }

  const admin = getAdminSupabaseClient()
  const { data, error } = await admin
    .from('redeem_codes')
    .insert({ code: code.toUpperCase().trim(), credits, max_uses: max_uses ?? 1, expires_at: expires_at || null })
    .select()

  if (error) {
    if (error.code === '23505') return reply.code(409).send({ error: 'Kode sudah ada, gunakan kode lain.' })
    return reply.code(500).send({ error: error.message })
  }
  return reply.code(201).send(data[0])
}

const route: FastifyPluginAsync = async (server) => {
  // GET: list redeem codes (admin)
  server.get('/', async (request: any, reply: any) => {
    const user = await getUserFromRequest(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const adminCheck = await checkIsAdmin(user.id)
    if (!adminCheck) return reply.code(403).send({ error: 'Forbidden' })

    const admin = getAdminSupabaseClient()
    const { data, error } = await admin
      .from('redeem_codes')
      .select('*, redeem_history(id, user_id, credits_received, redeemed_at)')
      .order('created_at', { ascending: false })

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data ?? [])
  })

  // POST: create redeem code (admin) OR redeem code (user)
  server.post('/', async (request: any, reply: any) => {
    const user = await getUserFromRequest(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const body = request.body || {}
    const { action } = body

    if (action === 'redeem') {
      return handleRedeem(user.id, body.code, reply)
    }

    const adminCheck = await checkIsAdmin(user.id)
    if (!adminCheck) return reply.code(403).send({ error: 'Forbidden' })

    return handleCreate(body, reply)
  })

  // PUT: update redeem code (admin)
  server.put('/', async (request: any, reply: any) => {
    const user = await getUserFromRequest(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const adminCheck = await checkIsAdmin(user.id)
    if (!adminCheck) return reply.code(403).send({ error: 'Forbidden' })

    const body = request.body || {}
    const { id, credits, max_uses, is_active, expires_at } = body
    if (!id) return reply.code(400).send({ error: 'ID required' })

    const admin = getAdminSupabaseClient()
    const updateObj: Record<string, any> = {}
    if (typeof credits === 'number' && credits > 0) updateObj.credits = credits
    if (typeof max_uses === 'number' && max_uses >= 1) updateObj.max_uses = max_uses
    if (typeof is_active === 'boolean') updateObj.is_active = is_active
    if (expires_at !== undefined) updateObj.expires_at = expires_at || null

    const { data, error } = await admin.from('redeem_codes').update(updateObj).eq('id', id).select()
    if (error) return reply.code(500).send({ error: error.message })
    if (!data?.length) return reply.code(404).send({ error: 'Not found' })
    return reply.send(data[0])
  })

  // DELETE: delete redeem code (admin)
  server.delete('/', async (request: any, reply: any) => {
    const user = await getUserFromRequest(request)
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const adminCheck = await checkIsAdmin(user.id)
    if (!adminCheck) return reply.code(403).send({ error: 'Forbidden' })

    const { id } = request.body || {}
    if (!id) return reply.code(400).send({ error: 'ID required' })

    const admin = getAdminSupabaseClient()
    const { error } = await admin.from('redeem_codes').delete().eq('id', id)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send({ ok: true })
  })
}

export default route
