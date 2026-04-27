import type { Context } from 'hono'

/**
 * Ambil access token dari header Authorization: Bearer.
 * Dipakai untuk Firebase Auth (ID token) dan verifikasi JWT lokal untuk D1/R2.
 */
export function getAccessTokenFromContext(c: Context): string | undefined {
  const auth = c.req.raw.headers.get('authorization')
  if (auth) {
    const parts = auth.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1]
  }

  return undefined
}
