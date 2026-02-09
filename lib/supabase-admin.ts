import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client dengan service role key.
 * Hanya untuk server (API routes), jangan expose ke client.
 * Dipakai untuk operasi tabel login_otps agar tidak terhalang RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
