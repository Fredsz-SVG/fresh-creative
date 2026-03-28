import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'

const creditsPackages = new Hono()

// GET /api/credits/packages
creditsPackages.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .order('price', { ascending: true })
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  return c.json(data)
})

// POST /api/credits/packages
creditsPackages.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const body = await c.req.json()
  const { credits, price, popular } = body
  const { data, error } = await supabase
    .from('credit_packages')
    .insert([{ credits, price, popular }])
    .select()
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  return c.json(data)
})

// PUT /api/credits/packages
creditsPackages.put('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const body = await c.req.json()
  const { id, credits, price, popular } = body
  if (!id) {
    return c.json({ error: 'ID is required' }, 400)
  }
  const { data, error } = await supabase
    .from('credit_packages')
    .update({ credits, price, popular })
    .eq('id', id)
    .select()
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  if (!data || data.length === 0) {
    return c.json({ error: 'No rows updated. Check RLS or ID.' }, 404)
  }
  return c.json(data)
})

// DELETE /api/credits/packages
creditsPackages.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const body = await c.req.json()
  const { id } = body
  if (!id) {
    return c.json({ error: 'ID is required' }, 400)
  }
  const { error } = await supabase
    .from('credit_packages')
    .delete()
    .eq('id', id)
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  return c.json({ success: true })
})

export default creditsPackages