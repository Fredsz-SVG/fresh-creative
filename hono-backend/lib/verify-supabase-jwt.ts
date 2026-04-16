import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose'

export type SupabaseAccessPayload = JWTPayload & {
  sub?: string
  email?: string
  role?: string
}

const jwksByOrigin = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJwks(supabaseUrl: string) {
  const base = supabaseUrl.replace(/\/$/, '')
  const jwksUrl = `${base}/auth/v1/.well-known/jwks.json`
  let jwks = jwksByOrigin.get(jwksUrl)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl))
    jwksByOrigin.set(jwksUrl, jwks)
  }
  return jwks
}

function authIssuer(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1`
}

function payloadOk(payload: JWTPayload): payload is SupabaseAccessPayload {
  return typeof payload.sub === 'string' && payload.sub.length > 0
}

export type VerifySupabaseJwtOptions = {
  /** Project URL, mis. https://xxxx.supabase.co */
  supabaseUrl: string
  /**
   * Legacy **shared secret** (HS256) — di dashboard: *Legacy JWT secret* → Reveal.
   * Wajib jika token masih `alg: HS256`. Token baru (ECC) tidak memakai ini.
   */
  jwtSecret?: string
}

/**
 * Verifikasi access token Supabase secara lokal (tanpa memanggil Auth API):
 * - **HS256** + shared secret → *Legacy JWT secret* dari dashboard.
 * - **ES256** (JWT Signing Keys / ECC) → kunci publik dari
 *   `GET {supabaseUrl}/auth/v1/.well-known/jwks.json`
 *
 * @see https://supabase.com/docs/guides/auth/signing-keys
 */
export async function verifySupabaseAccessToken(
  accessToken: string,
  options: VerifySupabaseJwtOptions
): Promise<{ payload: SupabaseAccessPayload } | { error: string }> {
  const { supabaseUrl, jwtSecret } = options
  if (!supabaseUrl?.trim()) {
    return { error: 'Missing supabaseUrl' }
  }

  let header: { alg?: string }
  try {
    header = decodeProtectedHeader(accessToken)
  } catch {
    return { error: 'Invalid token' }
  }

  const issuer = authIssuer(supabaseUrl)
  const alg = header.alg

  try {
    if (alg === 'HS256') {
      if (!jwtSecret) {
        return { error: 'HS256 token requires SUPABASE_JWT_SECRET (legacy JWT secret)' }
      }
      const key = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(accessToken, key, {
        algorithms: ['HS256'],
        issuer,
      })
      if (!payloadOk(payload)) return { error: 'Invalid token: missing sub' }
      return { payload: payload as SupabaseAccessPayload }
    }

    const jwks = getJwks(supabaseUrl)
    const { payload } = await jwtVerify(accessToken, jwks, { issuer })
    if (!payloadOk(payload)) return { error: 'Invalid token: missing sub' }
    return { payload: payload as SupabaseAccessPayload }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JWT verification failed'
    return { error: msg }
  }
}
