import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'

const userMe = new Hono()

// GET /api/user/me
userMe.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }
  const { data, error } = await supabase
    .from('users')
    .select('credits, is_suspended')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) {
    return c.json({ id: user.id, credits: 0, isSuspended: false })
  }
  return c.json({
    id: user.id,
    credits: data?.credits ?? 0,
    isSuspended: data?.is_suspended ?? false,
  })
})

export default userMe