import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getFonnteConfigFromD1 } from '../../lib/fonnte-config-d1'
import {
  landingConfigCache,
  LANDING_CONFIG_CACHE_KEY,
  LANDING_CONFIG_CACHE_TTL_MS,
} from '../../lib/public-cache'

const fonnteLanding = new Hono()

function requireDb(c: { env: unknown }): D1Database | null {
  return (c.env as { DB?: D1Database }).DB ?? null
}

// GET /api/landing/config — public; cache 5 menit agar tidak hit D1 tiap request
fonnteLanding.get('/config', async (c) => {
  const db = requireDb(c)
  if (!db) return c.json({ target: '' })

  // ── 1. Cek cache ──
  const cached = landingConfigCache.get(LANDING_CONFIG_CACHE_KEY)
  if (cached) {
    const clientEtag = c.req.header('If-None-Match')
    if (clientEtag && clientEtag === cached.etag) {
      return new Response(null, { status: 304 })
    }
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    c.header('ETag', cached.etag)
    c.header('X-Cache', 'HIT')
    return c.json(cached.value)
  }

  // ── 2. Query D1 ──
  try {
    const config = await getFonnteConfigFromD1(db)
    const entry = landingConfigCache.set(
      LANDING_CONFIG_CACHE_KEY,
      config as Record<string, unknown>,
      LANDING_CONFIG_CACHE_TTL_MS
    )
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    c.header('ETag', entry.etag)
    c.header('X-Cache', 'MISS')
    return c.json(config)
  } catch {
    return c.json({ target: '' })
  }
})

export default fonnteLanding






