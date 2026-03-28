import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'

const userNotificationsId = new Hono()

// PATCH - Mark single notification as read
userNotificationsId.patch('/:id', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { id } = c.req.param()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

export default userNotificationsId