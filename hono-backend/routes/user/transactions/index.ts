import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'

const userTransactions = new Hono()

// GET - List user transactions
userTransactions.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const { results } = await db
    .prepare(
      `SELECT t.id, t.external_id, t.amount, t.status, t.payment_method, t.invoice_url, t.created_at, t.album_id, t.description, a.package_snapshot, t.new_students_count, a.students_count as total_students,
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
})

export default userTransactions
