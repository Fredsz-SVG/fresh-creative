/**
 * rate-limit.ts
 * Simple in-memory rate limiter untuk Cloudflare Workers.
 *
 * Menggunakan sliding window per IP. Karena Workers bisa multi-isolate,
 * ini per-isolate — cukup untuk melindungi dari satu client agresif.
 *
 * Untuk rate limit global yang strict, gunakan Cloudflare Rate Limiting rules
 * di dashboard (Workers > Your Worker > Settings > Triggers).
 */

import type { Context, Next } from 'hono'

type RateEntry = {
  count: number
  resetAt: number
}

const ipStore = new Map<string, RateEntry>()

// Bersihkan entries yang sudah expired (jalankan berkala untuk mencegah memory leak)
function pruneExpired(): void {
  const now = Date.now()
  for (const [key, entry] of ipStore) {
    if (entry.resetAt <= now) ipStore.delete(key)
  }
}

let lastPrune = Date.now()

/**
 * Rate limit middleware.
 * @param maxRequests - maksimum request per window
 * @param windowMs   - durasi window dalam ms (default 60 detik)
 */
export function rateLimit(maxRequests: number, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    // Prune setiap 5 menit untuk cegah memory leak
    if (Date.now() - lastPrune > 5 * 60_000) {
      pruneExpired()
      lastPrune = Date.now()
    }

    // Ambil IP: Cloudflare inject CF-Connecting-IP
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
      'unknown'

    const now = Date.now()
    const entry = ipStore.get(ip)

    if (!entry || entry.resetAt <= now) {
      // Window baru
      ipStore.set(ip, { count: 1, resetAt: now + windowMs })
      c.header('X-RateLimit-Limit', String(maxRequests))
      c.header('X-RateLimit-Remaining', String(maxRequests - 1))
      c.header('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)))
      return next()
    }

    entry.count++
    const remaining = Math.max(0, maxRequests - entry.count)
    c.header('X-RateLimit-Limit', String(maxRequests))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json(
        { error: 'Too Many Requests', retryAfter },
        429
      )
    }

    return next()
  }
}
