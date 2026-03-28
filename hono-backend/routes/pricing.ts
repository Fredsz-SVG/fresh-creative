import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../lib/supabase'

const pricing = new Hono()

// GET /api/pricing
pricing.get('/', async (c) => {
  try {
    const supabase = getAdminSupabaseClient(c.env as any)
    const { data, error } = await supabase.from('pricing_packages').select('*')
    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
  } catch (err: any) {
    console.error('Pricing Error:', err)
    return c.json({ message: err?.message, stack: err?.stack, c_env: !!c.env, keys: Object.keys(c.env || {}) }, 500)
  }
})

// POST /api/pricing
pricing.post('/', async (c) => {
  const supabase = getAdminSupabaseClient(c.env as any)
  const body = await c.req.json().catch(() => ({}))
  const { name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = body
  const { data, error } = await supabase
    .from('pricing_packages')
    .insert([{ name, price_per_student: Number(price_per_student), min_students: Number(min_students), features, flipbook_enabled: !!flipbook_enabled, ai_labs_features: ai_labs_features ?? [], is_popular: !!is_popular }])
    .select()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

// PUT /api/pricing
pricing.put('/', async (c) => {
  const supabase = getAdminSupabaseClient(c.env as any)
  const body = await c.req.json().catch(() => ({}))
  const { id, name, price_per_student, min_students, features, flipbook_enabled, ai_labs_features, is_popular } = body
  if (!id) return c.json({ error: 'Package ID is required' }, 400)
  const { data, error } = await supabase
    .from('pricing_packages')
    .update({ name, price_per_student: Number(price_per_student), min_students: Number(min_students), features, flipbook_enabled: !!flipbook_enabled, ai_labs_features: ai_labs_features ?? [], is_popular: !!is_popular })
    .eq('id', id).select()
  if (error) return c.json({ error: error.message }, 500)
  if (!data || data.length === 0) return c.json({ error: 'Package not found' }, 404)
  return c.json(data)
})

// DELETE /api/pricing
pricing.delete('/', async (c) => {
  const supabase = getAdminSupabaseClient(c.env as any)
  const body = await c.req.json().catch(() => ({}))
  const { id } = body
  if (!id) return c.json({ error: 'Package ID is required' }, 400)
  const { error } = await supabase.from('pricing_packages').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ message: 'Package deleted successfully' })
})

export default pricing