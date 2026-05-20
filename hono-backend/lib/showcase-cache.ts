export type ShowcasePayload = {
  albumPreviews: unknown[]
  flipbookPreviewUrl: string
  contactUrl: string
}

let showcaseCache: ShowcasePayload | null = null
let showcaseCacheExpiresAt = 0
export const SHOWCASE_CACHE_TTL_MS = 5 * 60 * 1000

export function getShowcaseCache(now = Date.now()): ShowcasePayload | null {
  if (showcaseCache && now < showcaseCacheExpiresAt) return showcaseCache
  return null
}

export function setShowcaseCache(payload: ShowcasePayload, ttlMs = SHOWCASE_CACHE_TTL_MS): void {
  showcaseCache = payload
  showcaseCacheExpiresAt = Date.now() + ttlMs
}

export function invalidateShowcaseCache(): void {
  showcaseCache = null
  showcaseCacheExpiresAt = 0
}
