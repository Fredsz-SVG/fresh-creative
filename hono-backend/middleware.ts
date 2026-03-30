import { Context, Next } from 'hono'
import { getAccessTokenFromContext } from './lib/get-access-token'
import { verifySupabaseAccessToken } from './lib/verify-supabase-jwt'

// Simple auth middleware example
export async function requireAuth(c: Context, next: Next) {
  const { getSupabaseClient } = await import('./lib/supabase')
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', user)
  await next()
}

type EnvWithJwt = {
  SUPABASE_JWT_SECRET?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
}

/**
 * Verifikasi JWT lokal: HS256 (legacy secret) atau ES256 lewat JWKS (JWT Signing Keys).
 * Fallback: `getUser()` ke Supabase jika verifikasi lokal gagal / env kurang.
 */
export async function requireAuthJwt(c: Context, next: Next) {
  const token = getAccessTokenFromContext(c)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const env = c.env as EnvWithJwt
  const supabaseUrl = env?.NEXT_PUBLIC_SUPABASE_URL

  if (supabaseUrl) {
    const result = await verifySupabaseAccessToken(token, {
      supabaseUrl,
      jwtSecret: env?.SUPABASE_JWT_SECRET,
    })
    if (!('error' in result)) {
      c.set('userId', result.payload.sub!)
      await next()
      return
    }
  }

  const { getSupabaseClient } = await import('./lib/supabase')
  const supabase = getSupabaseClient(c)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401)
  c.set('userId', user.id)
  await next()
}

/** Ambil user id: prefer hasil requireAuthJwt, else fallback getUser() Supabase. */
export async function getAuthUserId(c: Context): Promise<string | null> {
  const fromVar = c.get('userId') as string | undefined
  if (fromVar) return fromVar

  const token = getAccessTokenFromContext(c)
  const env = c.env as EnvWithJwt
  const url = env?.NEXT_PUBLIC_SUPABASE_URL
  if (token && url) {
    const result = await verifySupabaseAccessToken(token, {
      supabaseUrl: url,
      jwtSecret: env?.SUPABASE_JWT_SECRET,
    })
    if (!('error' in result) && result.payload.sub) return result.payload.sub
  }

  const { getSupabaseClient } = await import('./lib/supabase')
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Simple logging middleware example
export async function logger(c: Context, next: Next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`)
}
