import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose'

export type FirebaseIdPayload = JWTPayload & {
  /** Firebase uid */
  sub?: string
  /** Firebase project id */
  aud?: string | string[]
  /** issuer */
  iss?: string
  /** email if available */
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  /** custom claims (e.g. role) */
  role?: string
}

const JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
)

const jwks = createRemoteJWKSet(JWKS_URL)

export type VerifyFirebaseJwtOptions = {
  projectId: string
}

function payloadOk(payload: JWTPayload): payload is FirebaseIdPayload {
  return typeof payload.sub === 'string' && payload.sub.length > 0
}

/**
 * Verify Firebase ID token locally via Google JWKS.
 *
 * References:
 * - Firebase: Verify ID tokens
 * - Token header `kid` matches Google's JWKS keys for securetoken service account
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  options: VerifyFirebaseJwtOptions
): Promise<{ payload: FirebaseIdPayload } | { error: string }> {
  const projectId = options.projectId?.trim()
  if (!projectId) return { error: 'Missing FIREBASE_PROJECT_ID' }

  // Quick sanity: reject non-JWT
  try {
    decodeProtectedHeader(idToken)
  } catch {
    return { error: 'Invalid token' }
  }

  const issuer = `https://securetoken.google.com/${projectId}`

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer,
      audience: projectId,
    })
    if (!payloadOk(payload)) return { error: 'Invalid token: missing sub' }
    return { payload: payload as FirebaseIdPayload }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JWT verification failed'
    return { error: msg }
  }
}

