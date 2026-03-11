import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ambil role user: prioritas dari tabel public.users, fallback ke JWT metadata.
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

        const metaRole = ((user as any).user_metadata?.role as string) || ((user as any).app_metadata?.role as string)
        if (metaRole === 'admin' || metaRole === 'user') return metaRole
    } catch {
        // tabel users belum ada / query gagal
    }
    return 'user'
}
