export type AiPricingRow = {
  id: string
  feature_slug: string
  credits_per_use: number
  credits_per_unlock: number
  duration_credits_json: string | null
}

let aiPricingCache: AiPricingRow[] | null = null
let aiPricingCacheExp = 0
export const AI_PRICING_CACHE_TTL_MS = 5 * 60 * 1000

export function getAiPricingCache(now = Date.now()): AiPricingRow[] | null {
  if (aiPricingCache && now < aiPricingCacheExp) return aiPricingCache
  return null
}

export function setAiPricingCache(rows: AiPricingRow[], ttlMs = AI_PRICING_CACHE_TTL_MS): void {
  aiPricingCache = rows
  aiPricingCacheExp = Date.now() + ttlMs
}

export function invalidateAiPricingCache(): void {
  aiPricingCache = null
  aiPricingCacheExp = 0
}
