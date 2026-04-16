import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'

const transactions = new Hono()

const txSelect = `t.id, t.user_id, t.external_id, t.amount, t.status, t.payment_method, t.invoice_url, t.created_at, t.album_id, t.description, a.package_snapshot, t.new_students_count, a.students_count as total_students,
  cp.credits as pkg_credits, a.name as album_name`

transactions.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  if ((await getRole(c, user)) !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const url = new URL(c.req.url)
  const scope = url.searchParams.get('scope')

  if (scope !== 'all') {
    const { results } = await db
      .prepare(
        `SELECT t.id, t.external_id, t.amount, t.status, t.payment_method, t.invoice_url, t.created_at, t.album_id, t.description,
          cp.credits as pkg_credits, a.name as album_name
         FROM transactions t
         LEFT JOIN credit_packages cp ON t.package_id = cp.id
         LEFT JOIN albums a ON t.album_id = a.id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>()
    const list = (results ?? []).map((row) => {
      const { pkg_credits, album_name, package_snapshot, new_students_count, total_students, ...rest } = row
      return { ...rest, credits: pkg_credits ?? null, album_name: album_name ?? null, package_snapshot: package_snapshot ?? null, new_students_count: new_students_count ?? null, total_students: total_students ?? null }
    })
    return c.json(list)
  }

  const { results: rows } = await db
    .prepare(
      `SELECT ${txSelect}
       FROM transactions t
       LEFT JOIN credit_packages cp ON t.package_id = cp.id
       LEFT JOIN albums a ON t.album_id = a.id
       ORDER BY t.created_at DESC`
    )
    .all<Record<string, unknown>>()

  const list = rows ?? []
  if (list.length === 0) return c.json([])

  const userIds = [...new Set(list.map((r) => r.user_id as string).filter(Boolean))]
  const placeholders = userIds.map(() => '?').join(',')
  const { results: users } = await db
    .prepare(`SELECT id, full_name, email FROM users WHERE id IN (${placeholders})`)
    .bind(...userIds)
    .all<{ id: string; full_name: string | null; email: string | null }>()
  const userMap = new Map(
    (users ?? []).map((u) => [u.id, { full_name: u.full_name || '-', email: u.email || '-' }])
  )

  return c.json(
    list.map((tx) => {
      const u = userMap.get(tx.user_id as string) || { full_name: '-', email: '-' }
      const { pkg_credits, album_name, package_snapshot, new_students_count, total_students, ...rest } = tx
        return {
          ...rest,
          credits: pkg_credits ?? null,
          album_name: album_name ?? null,
          package_snapshot: package_snapshot ?? null,
          new_students_count: new_students_count ?? null,
          total_students: total_students ?? null,
          user_full_name: u.full_name,
          user_email: u.email,
        }
    })
  )
})

export default transactions
