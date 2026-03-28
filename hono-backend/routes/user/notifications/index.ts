import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'

const userNotifications = new Hono()

// GET - List all notifications
userNotifications.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { data, error } = await supabase
    .from('notifications').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// POST - Create notification
userNotifications.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json()
  const { title, message, type, action_url, metadata } = body || {}
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: user.id, title, message, type: type || 'info', action_url, metadata })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// PATCH - Mark all as read
userNotifications.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// DELETE - Clear all
userNotifications.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

export default userNotifications