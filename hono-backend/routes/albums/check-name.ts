import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'
import { isSimilarSchoolName } from '../../lib/school-name-utils'

const checkName = new Hono()

checkName.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const url = new URL(c.req.url)
  const name = url.searchParams.get('name')?.trim()
  if (!name) {
    return c.json({ exists: false })
  }
  const { results: albums } = await db
    .prepare(`SELECT id, name, pic_name, wa_e164 FROM albums WHERE type = 'yearbook'`)
    .all<{ id: string; name: string | null; pic_name: string | null; wa_e164: string | null }>()
  if (!albums || albums.length === 0) {
    return c.json({ exists: false })
  }
  for (const album of albums) {
    if (isSimilarSchoolName(name, album.name || '')) {
      return c.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }
  }
  return c.json({ exists: false })
})

export default checkName
