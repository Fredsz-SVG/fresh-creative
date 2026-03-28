import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const overview = new Hono()

async function verifyAdmin(c: any) {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) { c.status(401); c.json({ error: 'Unauthorized' }); return null }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') { c.status(403); c.json({ error: 'Forbidden' }); return null }
  return { user, adminClient: getAdminSupabaseClient(c?.env as any) }
}

overview.get('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (!ctx) return
  const { adminClient } = ctx
  const url = new URL(c.req.url)
  const search = (url.searchParams.get('search') ?? '').trim()
  const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
  const perPageParam = parseInt(url.searchParams.get('perPage') ?? '10', 10)
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
  const perPage = Number.isNaN(perPageParam) || perPageParam < 1 ? 10 : perPageParam
  try {
    const authUsers = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (!authUsers.error && authUsers.data?.users?.length) {
      const rows = authUsers.data.users.map((u: any) => ({
        id: u.id, email: u.email,
        full_name: (u.user_metadata?.full_name as string) ?? null,
      }))
      await adminClient.from('users').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    }
    const { count: totalUsers } = await adminClient.from('users').select('*', { count: 'exact', head: true })
    const { count: totalAdmins } = await adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
    const since = new Date(); since.setDate(since.getDate() - 7)
    const { count: newUsers7d } = await adminClient.from('users').select('*', { count: 'exact', head: true }).gte('created_at', since.toISOString())
    const { data: creditRows } = await adminClient.from('users').select('credits')
    const totalCredits = (creditRows ?? []).reduce((sum: number, row: any) => sum + (typeof row.credits === 'number' ? row.credits : 0), 0)
    let listQuery = adminClient.from('users').select('id, email, full_name, role, credits, created_at, is_suspended', { count: 'exact' })
    if (search) listQuery = listQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    const from = (page - 1) * perPage
    const { data: latestUsers, error: latestError, count } = await listQuery.order('created_at', { ascending: false }).range(from, from + perPage - 1)
    if (latestError) return c.json({ error: latestError.message }, 500)
    return c.json({ totalUsers: totalUsers ?? 0, totalAdmins: totalAdmins ?? 0, totalCredits, newUsers7d: newUsers7d ?? 0, latestUsers: latestUsers ?? [], page, perPage, total: count ?? 0 })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to load overview' }, 500)
  }
})

overview.put('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (!ctx) return
  const { adminClient } = ctx
  const body = await c.req.json()
  const { id, credits, role, isSuspended } = body as any
  if (!id) return c.json({ error: 'Invalid payload' }, 400)
  const update: Record<string, any> = {}
  if (typeof credits === 'number') {
    if (credits < 0) return c.json({ error: 'Credits must be >= 0' }, 400)
    update.credits = credits
  }
  if (role === 'admin' || role === 'user') update.role = role
  else if (role !== undefined) return c.json({ error: 'Invalid role' }, 400)
  if (typeof isSuspended === 'boolean') update.is_suspended = isSuspended
  if (Object.keys(update).length === 0) return c.json({ error: 'No fields to update' }, 400)
  const { data, error } = await adminClient.from('users').update(update).eq('id', id).select('id, email, full_name, role, credits, created_at').maybeSingle()
  if (error) return c.json({ error: error.message }, 500)
  if (!data) return c.json({ error: 'User not found' }, 404)
  return c.json(data)
})

overview.delete('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (!ctx) return
  const { adminClient } = ctx
  const { id } = await c.req.json()
  if (!id) return c.json({ error: 'Invalid payload' }, 400)
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

export default overview
