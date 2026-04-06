import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getFonnteConfigFromD1 } from '../../lib/fonnte-config-d1'

const fonnteLanding = new Hono()

function requireDb(c: { env: unknown }): D1Database | null {
  return (c.env as { DB?: D1Database }).DB ?? null
}

// GET /api/landing/config — public endpoint to fetch current Fonnte target
fonnteLanding.get('/config', async (c) => {
  const db = requireDb(c)
  if (!db) return c.json({ target: '' })

  try {
    const config = await getFonnteConfigFromD1(db)
    return c.json(config)
  } catch {
    return c.json({ target: '' })
  }
})

export default fonnteLanding
