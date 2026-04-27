import type { Context } from 'hono'
import { getD1 } from './edge-env'

export type AuthUserLike = {
  id: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

/**
 * Role dari D1 `users.role`, fallback metadata JWT (tanpa Postgres Supabase).
 */
export async function getRole(
  c: Context,
  user:
    | AuthUserLike
): Promise<'admin' | 'user'> {
  const db = getD1(c)
  if (db) {
    try {
      const row = await db
        .prepare(`SELECT role FROM users WHERE id = ?`)
        .bind(user.id)
        .first<{ role: string }>()
      if (row?.role === 'admin') return 'admin'
      if (row?.role === 'user') return 'user'
    } catch {
      /* ignore */
    }
  }
  const metaRole = (user.user_metadata?.role as string) || (user.app_metadata?.role as string)
  if (metaRole === 'admin' || metaRole === 'user') return metaRole
  return 'user'
}

/** Back-compat: role dari object "session-like" (tanpa query DB). */
export function getRoleFromSession(session: { user?: AuthUserLike } | null): 'admin' | 'user' {
  const u = session?.user
  if (!u) return 'user'
  const role = (u.user_metadata?.role as string) || (u.app_metadata?.role as string)
  return role === 'admin' ? 'admin' : 'user'
}
