import type { D1Database } from '@cloudflare/workers-types'

export type D1UserRow = {
  id: string
  email: string
  role: string
  credits: number
  is_suspended: number
  full_name: string | null
}

function roleFromJwt(
  user: {
    id: string
    email: string | null
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
  }
): 'admin' | 'user' | null {
  const r = (user.app_metadata?.role as string) || (user.user_metadata?.role as string)
  if (r === 'admin' || r === 'user') return r
  return null
}

type LocalUserSyncRow = {
  role: string | null
  full_name: string | null
  credits: number | null
  is_suspended: number | null
  updated_at: string | null
}

export type EnsureUserInD1User = {
  id: string
  email: string | null
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

/**
 * Sinkron baris `users` di D1.
 * Prioritas role/profil: JWT → data existing D1 → default `user`.
 */
export async function ensureUserInD1(
  db: D1Database,
  user: EnsureUserInD1User
): Promise<void> {
  const email = user.email ?? ''
  const fullNameFromJwt =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  const metaRole = roleFromJwt(user)
  const fullName: string | null = fullNameFromJwt

  const existing = await db
    .prepare(`SELECT role, full_name, credits, is_suspended, updated_at FROM users WHERE id = ?`)
    .bind(user.id)
    .first<LocalUserSyncRow>()

  const insertRole = metaRole ?? (existing?.role === 'admin' ? 'admin' : 'user')

  await db.batch([
    db
      .prepare(`INSERT OR IGNORE INTO users (id, email, role, full_name) VALUES (?, ?, ?, ?)`)
      .bind(user.id, email, insertRole, fullName),
    db
      .prepare(
        `UPDATE users SET
          email = ?,
          full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(email, fullName, metaRole ?? null, user.id),
  ])
}

export async function getUserRow(db: D1Database, userId: string): Promise<D1UserRow | null> {
  const row = await db
    .prepare(`SELECT id, email, role, credits, is_suspended, full_name FROM users WHERE id = ?`)
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
