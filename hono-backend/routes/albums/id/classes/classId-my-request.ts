import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const myRequestRoute = new Hono()

myRequestRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: request_data, error } = await client
    .from('album_join_requests')
    .select('id, student_name, email, status, requested_at')
    .eq('assigned_class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ request: request_data ?? null })
})

export default myRequestRoute
