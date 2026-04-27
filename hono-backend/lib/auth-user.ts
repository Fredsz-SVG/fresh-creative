import type { Context } from 'hono'
import type { AppEnv, AuthContextUser } from '../middleware'
import { getAccessTokenFromContext } from './get-access-token'
import { verifyFirebaseIdToken } from './verify-firebase-jwt'

export type AuthUser = {
  id: string
  email: string | null
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

export function toAuthUser(u: AuthContextUser): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    user_metadata: {},
    app_metadata: u.role ? { role: u.role } : {},
  }
}

export function getAuthUserFromContext(c: Context<AppEnv>): AuthUser | null {
  const u = c.get('user')
  if (!u?.id) return null
  return toAuthUser(u)
}

type OptionalAuthEnv = {
  Bindings: { FIREBASE_PROJECT_ID?: string } & Record<string, unknown>
  Variables: Record<string, unknown>
}

function getAuthUserFromContextLoose<E extends { Bindings: object; Variables: object }>(
  c: Context<E>
): AuthUser | null {
  const u = c.get('user' as never) as AuthContextUser | undefined
  if (!u?.id) return null
  return toAuthUser(u)
}

export async function tryGetAuthUser<E extends OptionalAuthEnv>(c: Context<E>): Promise<AuthUser | null> {
  const fromCtx = getAuthUserFromContextLoose(c)
  if (fromCtx) return fromCtx

  const token = getAccessTokenFromContext(c)
  const projectId = (c.env as OptionalAuthEnv['Bindings'] | undefined)?.FIREBASE_PROJECT_ID ?? ''
  if (!token || !projectId) return null

  const verified = await verifyFirebaseIdToken(token, { projectId })
  if ('error' in verified) return null

  return {
    id: verified.payload.sub!,
    email: typeof verified.payload.email === 'string' ? verified.payload.email : null,
    user_metadata: {
      full_name: (verified.payload.name as string | undefined) ?? null,
    },
    app_metadata: {
      role: (verified.payload.role as string | undefined) ?? null,
    },
  }
}

