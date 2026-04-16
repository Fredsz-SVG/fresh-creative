import { createClient } from '@supabase/supabase-js'
import { Context } from 'hono'
import { getAccessTokenFromContext } from './get-access-token'

// ESM default export agar wrangler tidak error import
const supabaseModule = {}
export default supabaseModule

type EnvLike = Record<string, string | undefined>
type GlobalWithEnv = typeof globalThis & { env?: EnvLike }

export function getSupabaseClient(c: Context) {
  const token = getAccessTokenFromContext(c)
  return createClient(c.env.NEXT_PUBLIC_SUPABASE_URL!, c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  })
}

let adminClientCache: ReturnType<typeof createClient> | null = null

/**
 * Service role — **hanya** untuk `auth.admin.*` (list/delete user), bukan Postgres/Storage.
 * Data aplikasi lewat D1 + R2.
 */
export function getAdminSupabaseClient(env?: Record<string, string>) {
  if (adminClientCache) return adminClientCache

  const globalEnv =
    typeof globalThis !== 'undefined' ? (globalThis as GlobalWithEnv).env : undefined
  const processEnv = typeof process !== 'undefined' ? (process.env as EnvLike) : {}
  const e: EnvLike = env || globalEnv || processEnv
  const url = e?.NEXT_PUBLIC_SUPABASE_URL
  const key = e?.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars')

  adminClientCache = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClientCache
}
