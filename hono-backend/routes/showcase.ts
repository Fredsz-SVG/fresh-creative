import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import {
  defaultShowcase,
  enrichShowcasePreviewsWithAlbumCovers,
  getShowcaseFromD1,
} from '../lib/showcase-d1'

const showcase = new Hono()

// GET /api/showcase — public; data dari D1 (site_settings + cover dari tabel albums di D1)
showcase.get('/', async (c) => {
  const db = (c.env as { DB?: D1Database }).DB
  if (!db) return c.json(defaultShowcase)

  try {
    const base = await getShowcaseFromD1(db)
    const enrichedPreviews = await enrichShowcasePreviewsWithAlbumCovers(db, base.albumPreviews)
    return c.json({ albumPreviews: enrichedPreviews, flipbookPreviewUrl: base.flipbookPreviewUrl })
  } catch {
    return c.json(defaultShowcase)
  }
})

export default showcase
