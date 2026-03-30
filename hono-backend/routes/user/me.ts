import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, getUserRow, honoEnvForSupabasePublicSync } from '../../lib/d1-users'

const userMe = new Hono()

// GET /api/user/me
userMe.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
  const row = await getUserRow(db, user.id)
  if (!row) {
    return c.json({ id: user.id, credits: 0, isSuspended: false })
  }
  return c.json({
    id: user.id,
    credits: row.credits ?? 0,
    isSuspended: (row.is_suspended ?? 0) === 1,
  })
})

export default userMe