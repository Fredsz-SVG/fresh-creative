/**
 * public-cache.ts
 * In-memory cache untuk public endpoints (portfolio, landing config, dll)
 * Invalidate otomatis saat admin melakukan mutasi.
 *
 * Catatan: Cache ini per-isolate. Di Cloudflare Workers, setiap isolate
 * punya memori sendiri. Untuk konsistensi antar-isolate, andalkan
 * Cache-Control header agar Cloudflare CDN/browser cache yang bekerja.
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
  etag: string
}

class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  get(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  set(key: string, value: T, ttlMs: number): CacheEntry<T> {
    const etag = `"${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}"`
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs, etag }
    this.store.set(key, entry)
    return entry
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }
}

// ── Portfolio public cache ──────────────────────────────────────────────────
export const portfolioCache = new SimpleCache<unknown[]>()
export const PORTFOLIO_CACHE_KEY = 'portfolio:all'
export const PORTFOLIO_CACHE_TTL_MS = 5 * 60 * 1000 // 5 menit

/** Dipanggil dari admin/portfolio.ts setelah POST/PUT/DELETE */
export function invalidatePortfolioCache(): void {
  portfolioCache.invalidate(PORTFOLIO_CACHE_KEY)
}

// ── Landing config cache ────────────────────────────────────────────────────
export const landingConfigCache = new SimpleCache<Record<string, unknown>>()
export const LANDING_CONFIG_CACHE_KEY = 'landing:config'
export const LANDING_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 menit

/** Dipanggil dari admin/showcase.ts setelah PUT */
export function invalidateLandingConfigCache(): void {
  landingConfigCache.invalidate(LANDING_CONFIG_CACHE_KEY)
}

// ── Showcase public cache ───────────────────────────────────────────────────
// (showcase.ts masih punya cache sendiri; di sini tambah helper untuk TTL lebih panjang)
export const SHOWCASE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 menit (naik dari 20 detik)
export const PRICING_CACHE_TTL_MS = 5 * 60 * 1000  // 5 menit (naik dari 30 detik)
