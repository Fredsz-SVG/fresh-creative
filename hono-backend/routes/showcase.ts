import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import {
  defaultShowcase,
  enrichShowcasePreviewsWithAlbumCovers,
  getShowcaseFromD1,
} from '../lib/showcase-d1'
import {
  getShowcaseCache,
  setShowcaseCache,
  SHOWCASE_CACHE_TTL_MS,
  type ShowcasePayload,
} from '../lib/showcase-cache'

const showcase = new Hono()

// GET /api/showcase — public; data dari D1 (site_settings + cover dari tabel albums di D1)
showcase.get('/', async (c) => {
  const db = (c.env as { DB?: D1Database }).DB
  if (!db) return c.json(defaultShowcase)

  const now = Date.now()
  const cached = getShowcaseCache(now)
  if (cached) {
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    c.header('X-Cache', 'HIT')
    return c.json(cached)
  }

  try {
    const base = await getShowcaseFromD1(db)
    const enrichedPreviews = await enrichShowcasePreviewsWithAlbumCovers(db, base.albumPreviews)
    const payload: ShowcasePayload = {
      albumPreviews: enrichedPreviews,
      flipbookPreviewUrl: base.flipbookPreviewUrl,
      contactUrl: base.contactUrl,
    }
    setShowcaseCache(payload, SHOWCASE_CACHE_TTL_MS)
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    c.header('X-Cache', 'MISS')
    return c.json(payload)
  } catch {
    return c.json(defaultShowcase)
  }
})

export default showcase






