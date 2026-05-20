import type { Context } from 'hono'
import {
  invalidateAlbumCaches,
  invalidateCheckNameCache,
} from './album-response-cache'
import { invalidateShowcaseCache } from './showcase-cache'
import { invalidateLandingConfigCache, invalidatePortfolioCache } from './public-cache'
import {
  invalidateUserResponseCaches,
  invalidateUserTransactionsCache,
} from './user-response-cache'
import { invalidateAiPricingCache } from './ai-pricing-cache'
import { invalidatePricingCache } from '../routes/pricing'
import { invalidateCreditsPackagesCache } from '../routes/credits/packages'
import { publishRealtimeEventFromContext } from './realtime'

const ALBUM_CACHE_SKIP_FIRST_SEGMENTS = new Set(['check-name', 'invite-token'])

const USER_SCOPED_PREFIXES = [
  '/api/user/',
  '/api/credits/',
  '/api/ai-features/',
  '/api/admin/ai-edit',
] as const

function getUserIdFromContext(c: Context): string | null {
  const u = c.get('user') as { id?: string } | undefined
  return u?.id ?? null
}

/**
 * Panggil setelah mutasi API sukses (status < 400).
 * Menjaga cache in-memory Worker tetap konsisten dengan D1/R2.
 */
export function handleMutationCacheInvalidation(c: Context): void {
  const method = c.req.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return
  if (c.res.status >= 400) return

  const path = c.req.path

  if (USER_SCOPED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    const userId = getUserIdFromContext(c)
    if (userId) {
      invalidateUserResponseCaches(userId)
      invalidateUserTransactionsCache(userId)
    }
  }

  if (path === '/api/albums' || path.startsWith('/api/albums/')) {
    invalidateCheckNameCache()
    const match = path.match(/^\/api\/albums\/([^/]+)/)
    const albumId = match?.[1]
    if (albumId && !ALBUM_CACHE_SKIP_FIRST_SEGMENTS.has(albumId)) {
      invalidateAlbumCaches(albumId)
      invalidateShowcaseCache()
      void publishRealtimeEventFromContext(c, {
        type: 'album.data.changed',
        channel: `album:${albumId}`,
        payload: { albumId, method, path },
        ts: new Date().toISOString(),
      }).catch((e) => {
        console.error('publishRealtimeEventFromContext (album.data.changed):', e)
      })
    }
  }

  if (path.startsWith('/api/admin/showcase')) {
    invalidateShowcaseCache()
    invalidateLandingConfigCache()
  }

  if (path.startsWith('/api/admin/portfolio')) {
    invalidatePortfolioCache()
  }

  if (path.startsWith('/api/admin/ai-edit')) {
    invalidateAiPricingCache()
  }

  if (path.startsWith('/api/pricing')) {
    invalidatePricingCache()
  }

  if (path.startsWith('/api/credits/packages')) {
    invalidateCreditsPackagesCache()
  }
}

/** Dipanggil dari webhook / route yang mengubah album tanpa path /api/albums/:id/... */
export function invalidateCachesForAlbumId(albumId: string): void {
  if (!albumId) return
  invalidateAlbumCaches(albumId)
  invalidateCheckNameCache()
  invalidateShowcaseCache()
}

/** Dipanggil dari webhook pembayaran / penambahan kredit. */
export function invalidateCachesForUserId(userId: string): void {
  if (!userId) return
  invalidateUserResponseCaches(userId)
  invalidateUserTransactionsCache(userId)
}
