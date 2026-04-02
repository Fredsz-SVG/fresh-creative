import type { D1Database } from '@cloudflare/workers-types'
import type { User } from '@supabase/supabase-js'

export type D1UserRow = {
  id: string
  email: string
  role: string
  credits: number
  is_suspended: number
  full_name: string | null
}

/** Env Worker untuk baca `public.users` di Supabase (service role) — sinkron role/profil ke D1. */
export type SupabasePublicSyncEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export function honoEnvForSupabasePublicSync(env: unknown): SupabasePublicSyncEnv | undefined {
  const e = env as Record<string, string | undefined>
  const url = e.NEXT_PUBLIC_SUPABASE_URL
  const key = e.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return undefined
  return { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key }
}

function roleFromJwt(
  user: Pick<User, 'id' | 'email'> & {
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
  }
): 'admin' | 'user' | null {
  const r =
    (user.app_metadata?.role as string) || (user.user_metadata?.role as string)
  if (r === 'admin' || r === 'user') return r
  return null
}

type PublicUserRow = {
  role: string
  credits: number | null
  is_suspended: boolean
  full_name: string | null
}

async function fetchPublicUsersRow(
  userId: string,
  url: string,
  serviceKey: string
): Promise<PublicUserRow | null> {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client
    .from('users')
    .select('role, credits, is_suspended, full_name')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as PublicUserRow
}

type LocalUserSyncRow = {
  role: string | null
  full_name: string | null
  credits: number | null
  is_suspended: number | null
  updated_at: string | null
}

function parseD1TimestampToMs(value: string | null | undefined): number | null {
  if (!value) return null
  const iso = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = /Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  const ms = Date.parse(withZone)
  return Number.isFinite(ms) ? ms : null
}

export type EnsureUserInD1User = Pick<User, 'id' | 'email'> & {
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

/**
 * Sinkron baris `users` di D1.
 * Prioritas role/profil: **Supabase `public.users`** (jika env service role ada) → JWT → default `user`.
 * Ubah admin di Supabase saja; berikutnya request yang memanggil ini akan menyamakan D1.
 */
export async function ensureUserInD1(
  db: D1Database,
  user: EnsureUserInD1User,
  sync?: SupabasePublicSyncEnv
): Promise<void> {
  const email = user.email ?? ''
  const fullNameFromJwt =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  let metaRole = roleFromJwt(user)
  let fullName: string | null = fullNameFromJwt
  let creditsBind: number | null = null
  let suspendedBind: number | null = null

  const existing = await db
    .prepare(
      `SELECT role, full_name, credits, is_suspended, updated_at FROM users WHERE id = ?`
    )
    .bind(user.id)
    .first<LocalUserSyncRow>()

  const url = sync?.NEXT_PUBLIC_SUPABASE_URL
  const sk = sync?.SUPABASE_SERVICE_ROLE_KEY
  const PUBLIC_SYNC_TTL_MS = 5 * 60 * 1000
  const existingUpdatedAtMs = parseD1TimestampToMs(existing?.updated_at)
  const needsPublicSync =
    !!(url && sk) &&
    (!existing || !existingUpdatedAtMs || Date.now() - existingUpdatedAtMs > PUBLIC_SYNC_TTL_MS)

  if (needsPublicSync && url && sk) {
    const pg = await fetchPublicUsersRow(user.id, url, sk)
    if (pg) {
      if (pg.role === 'admin' || pg.role === 'user') metaRole = pg.role
      if (typeof pg.credits === 'number') creditsBind = pg.credits
      if (typeof pg.is_suspended === 'boolean') suspendedBind = pg.is_suspended ? 1 : 0
      if (Object.prototype.hasOwnProperty.call(pg, 'full_name')) {
        fullName = pg.full_name
      }
    }
  }

  const insertRole = metaRole ?? (existing?.role === 'admin' ? 'admin' : 'user')

  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO users (id, email, role, full_name) VALUES (?, ?, ?, ?)`
      )
      .bind(user.id, email, insertRole, fullName),
    db
      .prepare(
        `UPDATE users SET
          email = ?,
          full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          credits = COALESCE(?, credits),
          is_suspended = COALESCE(?, is_suspended),
          updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        email,
        fullName,
        metaRole ?? null,
        creditsBind,
        suspendedBind,
        user.id
      ),
  ])
}

export async function getUserRow(db: D1Database, userId: string): Promise<D1UserRow | null> {
  const row = await db
    .prepare(
      `SELECT id, email, role, credits, is_suspended, full_name FROM users WHERE id = ?`
    )
    .bind(userId)
    .first<D1UserRow>()
  return row ?? null
}

/**
 * Ensure row minimal user exists in D1 without remote Supabase sync.
 * Safe for hot-path endpoints to avoid extra network latency.
 */
export async function ensureUserStubInD1(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, role, full_name)
       VALUES (?, '', 'user', NULL)`
    )
    .bind(userId)
    .run()
}

export async function isUserSuspendedD1(db: D1Database, userId: string): Promise<boolean> {
  const row = await getUserRow(db, userId)
  return (row?.is_suspended ?? 0) === 1
}
