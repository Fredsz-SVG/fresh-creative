/**
 * API client untuk backend Hono (origin terpisah).
 * Mengirim Supabase access token di header Authorization bila cookie tidak ikut cross-origin.
 */
import { apiUrl } from './api-url'
import { supabase } from './supabase'

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
}

/**
 * fetch() to the backend API with auth token and credentials.
 * Merges Authorization header from current Supabase session.
 */
export async function fetchWithAuth(
  path: string,
  init?: FetchWithAuthInit
): Promise<Response> {
  const { skipAuth, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  if (!skipAuth) {
    const auth = await getAuthHeaders()
    Object.entries(auth).forEach(([k, v]) => headers.set(k, v))
  }
  return fetch(apiUrl(path), {
    ...rest,
    credentials: rest.credentials ?? 'include',
    headers,
  })
}
