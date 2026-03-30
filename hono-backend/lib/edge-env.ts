import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import type { Context } from 'hono'

/** Binding D1 dari wrangler (nama `DB`). */
export function getD1(c: Context): D1Database | undefined {
  return (c.env as { DB?: D1Database }).DB
}

/** Binding R2 dari wrangler (nama `ASSETS`). */
export function getAssets(c: Context): R2Bucket | undefined {
  return (c.env as { ASSETS?: R2Bucket }).ASSETS
}

/** Edge cepat: tanpa hop ke Supabase Auth API jika JWT secret ada. */
export function hasJwtSecret(c: Context): boolean {
  const s = (c.env as { SUPABASE_JWT_SECRET?: string }).SUPABASE_JWT_SECRET
  return typeof s === 'string' && s.length > 0
}
