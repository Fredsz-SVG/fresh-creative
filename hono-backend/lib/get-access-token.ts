import type { Context } from 'hono'

/**
 * Ambil access token Supabase dari cookie (SSR / legacy) atau header Authorization: Bearer.
 * Dipakai oleh getSupabaseClient dan verifikasi JWT lokal untuk D1/R2.
 */
export function getAccessTokenFromContext(c: Context): string | undefined {
  const cookies = c.req.raw.headers.get('cookie') || ''
  const cookieObj = Object.fromEntries(cookies.split(';').map((v) => v.trim().split('=')))
  let rawCookie = cookieObj['sb-access-token']

  if (
    !rawCookie &&
    c.env &&
    (c.env as { NEXT_PUBLIC_SUPABASE_URL?: string }).NEXT_PUBLIC_SUPABASE_URL
  ) {
    try {
      const ref = new URL(
        (c.env as { NEXT_PUBLIC_SUPABASE_URL: string }).NEXT_PUBLIC_SUPABASE_URL
      ).hostname.split('.')[0]
      const authKey = `sb-${ref}-auth-token`
      rawCookie = cookieObj[authKey]
      if (!rawCookie) {
        let chunkStr = ''
        for (let i = 0; i < 5; i++) {
          if (cookieObj[`${authKey}.${i}`]) chunkStr += cookieObj[`${authKey}.${i}`]
        }
        if (chunkStr) rawCookie = chunkStr
      }
    } catch {
      /* ignore */
    }
  }

  if (rawCookie) {
    try {
      let str = rawCookie
      if (str.startsWith('base64-')) {
        str = decodeURIComponent(escape(atob(str.substring(7))))
      }
      const parsed: unknown = JSON.parse(str)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const o = parsed as { access_token?: unknown }
        if (typeof o.access_token === 'string') return o.access_token
      }
      if (Array.isArray(parsed) && parsed[0]) {
        const first = parsed[0] as unknown
        if (typeof first === 'string') return first
        if (first && typeof first === 'object' && 'access_token' in first) {
          const at = (first as { access_token?: unknown }).access_token
          if (typeof at === 'string') return at
        }
      }
      if (typeof rawCookie === 'string' && rawCookie.startsWith('eyJ')) return rawCookie
    } catch {
      /* ignore */
    }
  }

  const auth = c.req.raw.headers.get('authorization')
  if (auth) {
    const parts = auth.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1]
  }

  return undefined
}
