import type { Context } from 'hono'
import type { User, Session } from '@supabase/supabase-js'
import { getD1 } from './edge-env'

/**
 * Role dari D1 `users.role`, fallback metadata JWT (tanpa Postgres Supabase).
 */
export async function getRole(
  c: Context,
  user:
    | User
    | {
        id: string
        user_metadata?: Record<string, unknown>
        app_metadata?: Record<string, unknown>
      }
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

/** Role dari session metadata saja (tanpa query DB). Untuk fallback cepat. */
export function getRoleFromSession(session: Session | null): 'admin' | 'user' {
  if (!session?.user) return 'user'
  const role =
    (session.user.user_metadata?.role as string) || (session.user.app_metadata?.role as string)
  return role === 'admin' ? 'admin' : 'user'
}
