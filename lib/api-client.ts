/**
 * API client untuk backend Hono (origin terpisah).
 * Mengirim Supabase access token di header Authorization bila cookie tidak ikut cross-origin.
 */
import { apiUrl } from './api-url'
import { supabase } from './supabase'

type CachedResponse = {
  expiresAt: number
  response: Response
}

const inflightGetRequests = new Map<string, Promise<Response>>()
const getResponseCache = new Map<string, CachedResponse>()

const DEFAULT_GET_TTL_MS_BY_PATH: Record<string, number> = {
  '/api/user/me': 3000,
  '/api/user/notifications': 3000,
  '/api/auth/otp-status': 3000,
  '/api/albums': 3000,
  '/api/showcase': 5000,
  '/api/pricing': 5000,
  '/api/select-area': 5000,
}

function getPathname(path: string): string {
  try {
    return new URL(apiUrl(path)).pathname
  } catch {
    return path.split('?')[0] ?? path
  }
}

function getDefaultGetTtlMs(path: string): number {
  const pathname = getPathname(path)
  return DEFAULT_GET_TTL_MS_BY_PATH[pathname] ?? 0
}

function buildRequestKey(method: string, fullUrl: string): string {
  return `${method.toUpperCase()}::${fullUrl}`
}

/**
 * Returns headers including Authorization: Bearer <token> when user is logged in.
 * Use for all requests to the API that require auth.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

export type FetchWithAuthInit = RequestInit & {
  /** If true, do not add Authorization header (e.g. public endpoints). Default false. */
  skipAuth?: boolean
  /** Optional TTL cache for GET response in milliseconds. */
  cacheTtlMs?: number
  /** Optional override key for in-flight dedupe and cache. */
  dedupeKey?: string
}

/**
 * fetch() to the backend API with auth token and credentials.
 * Merges Authorization header from current Supabase session.
 */
export async function fetchWithAuth(
  path: string,
  init?: FetchWithAuthInit
): Promise<Response> {
  const { skipAuth, cacheTtlMs, dedupeKey, ...rest } = init ?? {}
  const method = (rest.method ?? 'GET').toUpperCase()
  const fullUrl = apiUrl(path)
  const requestKey = dedupeKey ?? buildRequestKey(method, fullUrl)
  const shouldProcessGet = method === 'GET'
  const resolvedTtlMs =
    typeof cacheTtlMs === 'number' ? cacheTtlMs : getDefaultGetTtlMs(path)

  if (shouldProcessGet && resolvedTtlMs > 0) {
    const cached = getResponseCache.get(requestKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response.clone()
    }
    if (cached) {
      getResponseCache.delete(requestKey)
    }
  }

  if (shouldProcessGet) {
    const inflight = inflightGetRequests.get(requestKey)
    if (inflight) {
      const shared = await inflight
      return shared.clone()
    }
  }

  const requestPromise = (async () => {
    const headers = new Headers(rest.headers)
    if (!skipAuth) {
      const auth = await getAuthHeaders()
      Object.entries(auth).forEach(([k, v]) => headers.set(k, v))
    }
    const response = await fetch(fullUrl, {
      ...rest,
      credentials: rest.credentials ?? 'include',
      headers,
    })

    if (shouldProcessGet && resolvedTtlMs > 0 && response.ok) {
      getResponseCache.set(requestKey, {
        expiresAt: Date.now() + resolvedTtlMs,
        response: response.clone(),
      })
    }

    return response
  })()

  if (shouldProcessGet) {
    inflightGetRequests.set(requestKey, requestPromise)
  }

  try {
    const response = await requestPromise
    return response.clone()
  } finally {
    if (shouldProcessGet) {
      inflightGetRequests.delete(requestKey)
    }
  }
}
