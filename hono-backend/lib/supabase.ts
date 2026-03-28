

import { createClient } from '@supabase/supabase-js'
import { Context } from 'hono'
// ESM default export agar wrangler tidak error import
export default {}

export function getSupabaseClient(c: Context) {
  let token: string | undefined
  const cookies = c.req.raw.headers.get('cookie') || ''
  // Simple cookie parse (for demo, use a lib for production)
  const cookieObj = Object.fromEntries(cookies.split(';').map(v => v.trim().split('=')))
  let rawCookie = cookieObj['sb-access-token']

  // Modern @supabase/ssr cookies
  if (!rawCookie && c.env && c.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const ref = new URL(c.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
      const authKey = `sb-${ref}-auth-token`
      rawCookie = cookieObj[authKey]
      if (!rawCookie) {
        let chunkStr = ''
        for (let i = 0; i < 5; i++) {
          if (cookieObj[`${authKey}.${i}`]) chunkStr += cookieObj[`${authKey}.${i}`]
        }
        if (chunkStr) rawCookie = chunkStr
      }
    } catch {}
  }
  if (rawCookie) {
    try {
      let str = rawCookie
      if (str.startsWith('base64-')) {
        str = decodeURIComponent(escape(atob(str.substring(7))))
      }
      const parsed = JSON.parse(str)
      if (parsed?.access_token) token = parsed.access_token
      else if (Array.isArray(parsed) && parsed[0]) token = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0] as any).access_token || (parsed as any).access_token
      if (typeof rawCookie === 'string' && rawCookie.startsWith('eyJ')) token = rawCookie
    } catch {}
  }
  // Fallback ke Authorization header
  if (!token) {
    const auth = c.req.raw.headers.get('authorization')
    if (auth) {
      const parts = auth.split(' ')
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1]
      }
    }
  }
  return createClient(
    c.env.NEXT_PUBLIC_SUPABASE_URL!,
    c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }
  )
}

let adminClientCache: ReturnType<typeof createClient> | null = null

export function getAdminSupabaseClient(env?: Record<string, string>) {
  if (adminClientCache) return adminClientCache

  const e = env || (typeof globalThis !== 'undefined' && (globalThis as any).env) || (typeof process !== 'undefined' ? process.env : {})
  const url = e?.NEXT_PUBLIC_SUPABASE_URL
  const key = e?.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars')
  
  adminClientCache = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClientCache
}
