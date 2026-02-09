import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  throw new Error(
    `Supabase: Tambahkan ${missing.join(' dan ')} di .env.local. Ambil dari: https://supabase.com/dashboard/project/_/settings/api`
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

