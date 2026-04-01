import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
let client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (client) return client

  if (!supabaseUrl || !supabaseKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw new Error(
      `Supabase: Tambahkan ${missing.join(' dan ')} di .env.local. Ambil dari: https://supabase.com/dashboard/project/_/settings/api`
    )
  }

  client = createBrowserClient(supabaseUrl, supabaseKey)
  return client
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop, receiver) {
    const realClient = getClient() as unknown as Record<PropertyKey, unknown>
    const value = Reflect.get(realClient, prop, receiver)
    return typeof value === 'function' ? value.bind(realClient) : value
  },
})

