import type { Context } from 'hono'
import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import type { D1Database } from '@cloudflare/workers-types'

const overview = new Hono()

async function verifyAdmin(
  c: Context
): Promise<
  | Response
  | { user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; db: D1Database }
> {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }
  // Sinkron JWT → D1 dulu; tanpa ini getRole bisa baca D1 lama (user) walau JWT sudah admin.
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, user)) !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return { user, db }
}

overview.get('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (ctx instanceof Response) return ctx
  const { db } = ctx
  const url = new URL(c.req.url)
  const search = (url.searchParams.get('search') ?? '').trim()
  const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
  const perPageParam = parseInt(url.searchParams.get('perPage') ?? '10', 10)
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
  const perPage = Number.isNaN(perPageParam) || perPageParam < 1 ? 10 : perPageParam
  try {
    const adminAuth = getAdminSupabaseClient(c?.env as Record<string, string>)
    const authUsers = await adminAuth.auth.admin.listUsers({ perPage: 1000 })
    if (!authUsers.error && authUsers.data?.users?.length) {
      for (const u of authUsers.data.users) {
        await ensureUserInD1(
          db,
          u as Parameters<typeof ensureUserInD1>[1],
          honoEnvForSupabasePublicSync(c.env)
        )
      }
    }

    const totalUsers =
      (await db.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>())?.c ?? 0
    const totalAdmins =
      (await db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`).first<{ c: number }>())?.c ?? 0
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const sinceIso = since.toISOString()
    const newUsers7d =
      (
        await db
          .prepare(`SELECT COUNT(*) as c FROM users WHERE created_at >= ?`)
          .bind(sinceIso)
          .first<{ c: number }>()
      )?.c ?? 0

    const creditRows = await db.prepare(`SELECT credits FROM users`).all<{ credits: number | null }>()
    const totalCredits = (creditRows.results ?? []).reduce(
      (sum, row) => sum + (typeof row.credits === 'number' ? row.credits : 0),
      0
    )

    const from = (page - 1) * perPage
    const like = search ? `%${search}%` : null

    const countFiltered = like
      ? await db
          .prepare(
            `SELECT COUNT(*) as c FROM users WHERE email LIKE ? OR COALESCE(full_name, '') LIKE ?`
          )
          .bind(like, like)
          .first<{ c: number }>()
      : await db.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>()
    const total = countFiltered?.c ?? 0

    const { results: latestUsers } = like
      ? await db
          .prepare(
            `SELECT id, email, full_name, role, credits, created_at, is_suspended FROM users 
             WHERE email LIKE ? OR COALESCE(full_name, '') LIKE ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`
          )
          .bind(like, like, perPage, from)
          .all<Record<string, unknown>>()
      : await db
          .prepare(
            `SELECT id, email, full_name, role, credits, created_at, is_suspended FROM users 
             ORDER BY created_at DESC LIMIT ? OFFSET ?`
          )
          .bind(perPage, from)
          .all<Record<string, unknown>>()

    return c.json({
      totalUsers,
      totalAdmins,
      totalCredits,
      newUsers7d,
      latestUsers: latestUsers ?? [],
      page,
      perPage,
      total,
    })
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Failed to load overview' }, 500)
  }
})

overview.put('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (ctx instanceof Response) return ctx
  const { db, user: currentUser } = ctx
  const body = await c.req.json()
  const { id, credits, role, isSuspended } = body as Record<string, unknown>
  if (!id || typeof id !== 'string') return c.json({ error: 'Invalid payload' }, 400)

  // Source of truth: update Supabase `public.users` first.
  // UI admin ini memodifikasi credits/role/suspend; sebelumnya hanya mengubah D1.
  if (typeof credits === 'number' && credits < 0) return c.json({ error: 'Credits must be >= 0' }, 400)

  // Safety: admin tidak boleh mengubah role miliknya sendiri.
  // Ini mencegah self-demote yang bisa bikin admin terkunci/inkonsisten.
  if (id === currentUser.id && typeof role !== 'undefined') {
    return c.json({ error: 'Forbidden: cannot change your own role' }, 403)
  }

  // Safety: admin tidak boleh suspend/unsuspend dirinya sendiri.
  if (id === currentUser.id && typeof isSuspended !== 'undefined') {
    return c.json({ error: 'Forbidden: cannot change your own suspension status' }, 403)
  }

  const adminAuth = getAdminSupabaseClient(c?.env as Record<string, string>)
  const supaUpdate: Record<string, unknown> = {}
  if (typeof credits === 'number') supaUpdate.credits = credits
  if (role === 'admin' || role === 'user') supaUpdate.role = role
  else if (role !== undefined) return c.json({ error: 'Invalid role' }, 400)
  if (typeof isSuspended === 'boolean') supaUpdate.is_suspended = isSuspended

  if (Object.keys(supaUpdate).length > 0) {
    const { error: supaError } = await (adminAuth as any).from('users').update(supaUpdate).eq('id', id)
    if (supaError) return c.json({ error: supaError.message }, 500)
  }

  const update: string[] = []
  const vals: unknown[] = []
  if (typeof credits === 'number') {
    if (credits < 0) return c.json({ error: 'Credits must be >= 0' }, 400)
    update.push('credits = ?')
    vals.push(credits)
  }
  if (role === 'admin' || role === 'user') {
    update.push('role = ?')
    vals.push(role)
  } else if (role !== undefined) return c.json({ error: 'Invalid role' }, 400)
  if (typeof isSuspended === 'boolean') {
    update.push('is_suspended = ?')
    vals.push(isSuspended ? 1 : 0)
  }
  if (update.length === 0) return c.json({ error: 'No fields to update' }, 400)
  update.push(`updated_at = datetime('now')`)
  vals.push(id)
  const sql = `UPDATE users SET ${update.join(', ')} WHERE id = ?`
  const r = await db.prepare(sql).bind(...vals).run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  if (r.meta.changes === 0) return c.json({ error: 'User not found' }, 404)
  const row = await db
    .prepare(`SELECT id, email, full_name, role, credits, created_at FROM users WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()
  return c.json(row)
})

overview.delete('/', async (c) => {
  const ctx = await verifyAdmin(c)
  if (ctx instanceof Response) return ctx
  const { db } = ctx
  const body = await c.req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return c.json({ error: 'Invalid payload' }, 400)
  const adminAuth = getAdminSupabaseClient(c?.env as Record<string, string>)
  const { error } = await adminAuth.auth.admin.deleteUser(id)
  if (error) return c.json({ error: error.message }, 500)
  await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default overview
