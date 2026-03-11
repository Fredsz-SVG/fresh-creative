"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRole = getRole;
/**
 * Ambil role user: prioritas dari tabel public.users, fallback ke JWT metadata.
 */
async function getRole(supabase, user) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
        if (!error && data?.role === 'admin')
            return 'admin';
        if (!error && data?.role === 'user')
            return 'user';
        const metaRole = user.user_metadata?.role || user.app_metadata?.role;
        if (metaRole === 'admin' || metaRole === 'user')
            return metaRole;
    }
    catch {
        // tabel users belum ada / query gagal
    }
    return 'user';
}
