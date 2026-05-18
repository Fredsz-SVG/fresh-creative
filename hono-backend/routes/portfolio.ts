import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import {
  portfolioCache,
  PORTFOLIO_CACHE_KEY,
  PORTFOLIO_CACHE_TTL_MS,
} from '../lib/public-cache'

const portfolio = new Hono()

// GET /api/portfolio — public; cache 5 menit di memory + CDN
portfolio.get('/', async (c) => {
  const db = (c.env as { DB: D1Database }).DB
  if (!db) return c.json([])

  // ── 1. Cek in-memory cache ──
  const cached = portfolioCache.get(PORTFOLIO_CACHE_KEY)
  if (cached) {
    // ETag: kalau client kirim If-None-Match dan cocok → 304
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
    const { results } = await db
      .prepare(
        'SELECT id, title, subtitle, description as desc, image_url as img, video_url FROM portfolio_items ORDER BY display_order ASC'
      )
      .all()

    const entry = portfolioCache.set(PORTFOLIO_CACHE_KEY, results ?? [], PORTFOLIO_CACHE_TTL_MS)
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    c.header('ETag', entry.etag)
    c.header('X-Cache', 'MISS')
    return c.json(results ?? [])
  } catch (e) {
    console.error('Fetch portfolio failed:', e)
    return c.json([])
  }
})

export default portfolio






