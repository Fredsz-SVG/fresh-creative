import { Context, Next } from 'hono'
import { getAccessTokenFromContext } from './lib/get-access-token'
import { verifyFirebaseIdToken } from './lib/verify-firebase-jwt'
import { getD1 } from './lib/edge-env'

// Simple auth middleware example
export async function requireAuth(c: Context, next: Next) {
  return await requireAuthJwt(c, next)
}

type EnvWithFirebase = {
  FIREBASE_PROJECT_ID?: string
}

export type AuthContextUser = {
  id: string
  email?: string | null
  role?: 'admin' | 'user'
}

export type AppEnv = {
  Bindings: EnvWithFirebase & Record<string, unknown>
  Variables: {
    userId: string
    user: AuthContextUser
  }
}

/**
 * Firebase Auth-only: verifikasi Firebase ID token secara lokal via JWKS.
 */
export async function requireAuthJwt(c: Context<AppEnv>, next: Next) {
  const token = getAccessTokenFromContext(c)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const env = c.env as EnvWithFirebase
  const projectId = env?.FIREBASE_PROJECT_ID
  const result = await verifyFirebaseIdToken(token, { projectId: projectId ?? '' })
  if ('error' in result) return c.json({ error: 'Unauthorized' }, 401)

  const uid = result.payload.sub!
  const email = typeof result.payload.email === 'string' ? result.payload.email : null
  const name = typeof result.payload.name === 'string' ? result.payload.name : null

  c.set('userId', uid)

  // Resolve app role from D1 (admin/user), fallback to custom claim `role`
  const { getRole } = await import('./lib/auth')
  const claimRole = (typeof result.payload.role === 'string' ? result.payload.role : '').toLowerCase()

  // Keep D1 users row up-to-date (email/full_name/role from token).
  // This fixes empty email/full_name rows when user first signs in via Google.
  const db = getD1(c)
  if (db) {
    const { ensureUserInD1 } = await import('./lib/d1-users')
    await ensureUserInD1(db, {
      id: uid,
      email,
      user_metadata: name ? { full_name: name, name } : {},
      app_metadata: claimRole ? { role: claimRole } : {},
    })
  }
  const appRole = await getRole(c, {
    id: uid,
    user_metadata: name ? { full_name: name, name } : {},
    app_metadata: claimRole ? { role: claimRole } : {},
  })

  c.set('user', { id: uid, email, role: appRole } satisfies AuthContextUser)
  await next()
}

/** Ambil user id: prefer hasil requireAuthJwt, else fallback getUser() Supabase. */
export async function getAuthUserId(c: Context): Promise<string | null> {
  const fromVar = c.get('userId') as string | undefined
  if (fromVar) return fromVar

  const token = getAccessTokenFromContext(c)
  const env = c.env as EnvWithFirebase
  const projectId = env?.FIREBASE_PROJECT_ID
  if (!token || !projectId) return null
  const result = await verifyFirebaseIdToken(token, { projectId })
  if (!('error' in result) && result.payload.sub) return result.payload.sub
  return null
}

// Simple logging middleware example
export async function logger(c: Context, next: Next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`)
}
