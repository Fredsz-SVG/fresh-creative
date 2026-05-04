import type { Context } from 'hono'
import { Hono } from 'hono'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1 } from '../../lib/d1-users'
import { publishRealtimeEventFromContext } from '../../lib/realtime'
import type { D1Database } from '@cloudflare/workers-types'
import { AppEnv, requireAuthJwt } from '../../middleware'
import { getAuthUserFromContext } from '../../lib/auth-user'

const overview = new Hono<AppEnv>()
overview.use('*', requireAuthJwt)

async function verifyAdmin(c: Context<AppEnv>): Promise<
  | Response
  | {
      user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
      db: D1Database
    }
> {
  const db = getD1(c)
  const user = getAuthUserFromContext(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }
  // Sinkron JWT → D1 dulu; tanpa ini getRole bisa baca D1 lama (user) walau JWT sudah admin.
  await ensureUserInD1(db, user)
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
    const totalUsers =
      (await db.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>())?.c ?? 0
    const totalAdmins =
      (
        await db
          .prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`)
          .first<{ c: number }>()
      )?.c ?? 0
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

    const creditRows = await db
      .prepare(`SELECT credits FROM users`)
      .all<{ credits: number | null }>()
    const totalCredits = (creditRows.results ?? []).reduce(
      (sum, row) => sum + (typeof row.credits === 'number' ? row.credits : 0),
      0
    )

    const role = url.searchParams.get('role') // 'admin' | 'user' | null
    const sort = url.searchParams.get('sort') // 'credits' | 'newest' | null
    const days = parseInt(url.searchParams.get('days') ?? '0', 10)
    const from = (page - 1) * perPage
    const like = search ? `%${search}%` : null

    let whereClause = ''
    const whereParams: unknown[] = []

    if (like) {
      whereClause = `WHERE (email LIKE ? OR COALESCE(full_name, '') LIKE ?)`
      whereParams.push(like, like)
    }

    if (role) {
      if (whereClause) {
        whereClause += ` AND role = ?`
      } else {
        whereClause = `WHERE role = ?`
      }
      whereParams.push(role)
    }

    if (days > 0) {
      const date = new Date()
      date.setDate(date.getDate() - days)
      const dateIso = date.toISOString()
      if (whereClause) {
        whereClause += ` AND created_at >= ?`
      } else {
        whereClause = `WHERE created_at >= ?`
      }
      whereParams.push(dateIso)
    }

    const countFiltered = await db
      .prepare(`SELECT COUNT(*) as c FROM users ${whereClause}`)
      .bind(...whereParams)
      .first<{ c: number }>()
    const total = countFiltered?.c ?? 0

    let orderBy = 'created_at DESC'
    if (sort === 'credits') {
      orderBy = 'COALESCE(credits, 0) DESC, created_at DESC'
    } else if (role === 'admin') {
      orderBy = 'full_name ASC'
    }
    const query = `
      SELECT id, email, full_name, role, credits, created_at, is_suspended FROM users 
      ${whereClause}
      ORDER BY ${orderBy} LIMIT ? OFFSET ?
    `
    const { results: latestUsers } = await db
      .prepare(query)
      .bind(...whereParams, perPage, from)
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

  if (typeof credits === 'number' && credits < 0)
    return c.json({ error: 'Credits must be >= 0' }, 400)

  // Safety: admin tidak boleh mengubah role miliknya sendiri.
  // Ini mencegah self-demote yang bisa bikin admin terkunci/inkonsisten.
  if (id === currentUser.id && typeof role !== 'undefined') {
    return c.json({ error: 'Forbidden: cannot change your own role' }, 403)
  }

  // Safety: admin tidak boleh suspend/unsuspend dirinya sendiri.
  if (id === currentUser.id && typeof isSuspended !== 'undefined') {
    return c.json({ error: 'Forbidden: cannot change your own suspension status' }, 403)
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
  const r = await db
    .prepare(sql)
    .bind(...vals)
    .run()
  if (!r.success) return c.json({ error: 'Update failed' }, 500)
  if (r.meta.changes === 0) return c.json({ error: 'User not found' }, 404)
  const row = await db
    .prepare(`SELECT id, email, full_name, role, credits, created_at FROM users WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>()

  if (typeof isSuspended === 'boolean') {
    try {
      await publishRealtimeEventFromContext(c, {
        type: 'user.suspended',
        channel: 'global',
        payload: { userId: id, isSuspended },
        ts: new Date().toISOString(),
      })
    } catch (e) {
      console.error('publishRealtimeEventFromContext failed:', e)
    }
  }

  return c.json(row)
})



export default overview
