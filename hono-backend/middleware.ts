import { Hono } from 'hono'
import { Context, Next } from 'hono'

// Simple auth middleware example
export async function requireAuth(c: Context, next: Next) {
  const { getSupabaseClient } = await import('./lib/supabase')
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', user)
  await next()
}

// Simple logging middleware example
export async function logger(c: Context, next: Next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`)
}
