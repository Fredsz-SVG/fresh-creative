import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'

const portfolio = new Hono()

portfolio.get('/', async (c) => {
  const db = (c.env as { DB: D1Database }).DB
  if (!db) return c.json([])
  
  try {
    const { results } = await db.prepare(
      'SELECT id, title, subtitle, description as desc, image_url as img FROM portfolio_items ORDER BY display_order ASC'
    ).all()
    return c.json(results)
  } catch (e) {
    console.error('Fetch portfolio failed:', e)
    return c.json([])
  }
})

export default portfolio
