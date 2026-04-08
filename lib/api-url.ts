/**
 * Origin untuk request API.
 * - Browser: string kosong → path relatif ke app Next; next.config.js mem-proksi /api/* ke Hono
 *   (same-origin, tanpa CORS, tetap jalan walau env mengarah ke 127.0.0.1:8787 tapi firewall/browser membatasi).
 * - Server (RSC/Route Handler): URL app (NEXT_PUBLIC_APP_URL / VERCEL_URL), agar fetch memicu rewrite proxy.
 *
 * NEXT_PUBLIC_API_URL tetap dipakai di next.config.js sebagai target proxy.
 */
function getServerAppOrigin(): string {
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (explicit) {
        return explicit.endsWith('/') ? explicit.slice(0, -1) : explicit
    }
    const vercel = process.env.VERCEL_URL?.trim()
    if (vercel) {
        const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')
        return `https://${host}`
    }
    return 'http://localhost:3000'
}

export function getApiUrl(): string {
  // Browser:
  // Prefer direct Hono origin if configured to avoid dev-proxy timeouts for long-running AI calls.
  if (typeof window !== 'undefined') {
    const direct = process.env.NEXT_PUBLIC_API_URL?.trim()
    if (direct) return direct.endsWith('/') ? direct.slice(0, -1) : direct
    return ''
  }
  // Server (RSC/Route Handler):
  return getServerAppOrigin()
}

/**
 * Helper to build a full API URL from a path.
 * Usage: apiUrl('/api/albums') => 'http://127.0.0.1:8787/api/albums'
 */
export function apiUrl(path: string): string {
    const base = getApiUrl()
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${cleanPath}`
}
