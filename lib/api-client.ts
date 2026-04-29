/**
 * API client untuk backend Hono (origin terpisah).
 * Mengirim Firebase ID token di header Authorization bila cookie tidak ikut cross-origin.
 */
import { apiUrl } from './api-url'
import { convertToWebP } from './image-conversion'
import { getIdToken } from './auth-client'

type CachedResponse = {
  expiresAt: number
  response: Response
}

const inflightGetRequests = new Map<string, Promise<Response>>()
const getResponseCache = new Map<string, CachedResponse>()

function hashString(input: string): string {
  // Simple non-crypto hash for cache key scoping.
  // (We only need to prevent accidental cross-request sharing.)
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return String(hash >>> 0)
}

const DEFAULT_GET_TTL_MS_BY_PATH: Record<string, number> = {
  // Credits can change due to AI usage; keep it effectively real-time.
  '/api/user/me': 0,
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

/**
 * WebP + resize di client hanya untuk upload persisten (mis. ke R2).
 * AI Labs (try-on, pose, photo group, photo-to-video, image editor / credit ai-edit) mengirim
 * gambar untuk Replicate atau proses lokal — hindari re-encode agar kualitas input tidak turun.
 */
function shouldOptimizeFormDataImages(path: string): boolean {
  const pathname = getPathname(path)
  if (pathname.startsWith('/api/ai-features/')) return false
  if (pathname.startsWith('/api/admin/ai-edit')) return false
  return true
}

function buildRequestKey(method: string, fullUrl: string): string {
  return `${method.toUpperCase()}::${fullUrl}`
}

/**
 * Returns headers including Authorization: Bearer <token> when user is logged in.
 * Use for all requests to the API that require auth.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const token = await getIdToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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
  const shouldProcessGet = method === 'GET'
  const resolvedTtlMs =
    typeof cacheTtlMs === 'number' ? cacheTtlMs : getDefaultGetTtlMs(path)

  // Pre-resolve auth headers so cache/dedupe keys are scoped per token.
  const authHeaders = skipAuth ? {} : await getAuthHeaders()
  const authToken = authHeaders.Authorization?.startsWith('Bearer ')
    ? authHeaders.Authorization.slice('Bearer '.length)
    : ''
  const authFingerprint = authToken ? hashString(authToken) : 'anon'

  const baseKey = dedupeKey ?? buildRequestKey(method, fullUrl)
  // If caller didn't provide dedupeKey explicitly, scope by auth token to avoid
  // sharing cached/inflight responses across token lifecycle.
  const requestKey = skipAuth || dedupeKey ? baseKey : `${baseKey}::auth:${authFingerprint}`

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

  // R2-bound uploads: raster di FormData → WebP + clamp long edge + target ≤1000 KiB (lib/image-conversion).
  // Lewati untuk AI Labs & ai-edit (bukan destinasi R2). GIF tidak disentuh; decode gagal → file asli.
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
  if (isBrowser && rest.body instanceof FormData && shouldOptimizeFormDataImages(path)) {
    const originalFormData = rest.body
    const newFormData = new FormData()
    let hasChanged = false

    for (const [key, value] of (originalFormData as any).entries()) {
      if (value instanceof File && value.type.startsWith('image/') && value.type !== 'image/gif') {
        try {
          const webpBlob = await convertToWebP(value)
          const newName = value.name.replace(/\.[^/.]+$/, '') + '.webp'
          newFormData.append(key, webpBlob, newName)
          hasChanged = true
        } catch (e) {
          console.error('Global WebP conversion failed for', value.name, e)
          newFormData.append(key, value)
        }
      } else {
        newFormData.append(key, value)
      }
    }

    if (hasChanged) {
      rest.body = newFormData
    }
  }

  const requestPromise = (async () => {
    const headers = new Headers(rest.headers)
    Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v))
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
