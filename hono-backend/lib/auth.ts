import type { User, Session } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ambil role user: prioritas dari tabel public.users (supabase), fallback ke JWT metadata.
 * Jadi kalau role diubah di database, langsung dipakai setelah refresh/fetch.
 */
export async function getRole(
  supabase: SupabaseClient,
  user: User | { id: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }
): Promise<'admin' | 'user'> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && data?.role === 'admin') return 'admin'
    if (!error && data?.role === 'user') return 'user'

    const metaRole = (user.user_metadata?.role as string) || (user.app_metadata?.role as string)
    if (metaRole === 'admin' || metaRole === 'user') return metaRole
  } catch {
    // tabel users belum ada / query gagal — anggap user
  }
  return 'user'
}

/** Role dari session metadata saja (tanpa query DB). Untuk fallback cepat. */
export function getRoleFromSession(session: Session | null): 'admin' | 'user' {
  if (!session?.user) return 'user'
  const role = (session.user.user_metadata?.role as string) || (session.user.app_metadata?.role as string)
  return role === 'admin' ? 'admin' : 'user'
}
