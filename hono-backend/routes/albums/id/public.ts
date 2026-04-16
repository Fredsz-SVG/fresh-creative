import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'

const albumsIdPublic = new Hono()

albumsIdPublic.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const db = getD1(c)
    if (!db) {
      return c.json({ error: 'Database not configured' }, 503)
    }
    const album = await db
      .prepare(`SELECT id, name, description, students_count FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{
        id: string
        name: string
        description: string | null
        students_count: number | null
      }>()
    if (!album) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }
    const { results: classes } = await db
      .prepare(
        `SELECT id, name, sort_order FROM album_classes WHERE album_id = ? ORDER BY sort_order ASC`
      )
      .bind(albumId)
      .all<{ id: string; name: string; sort_order: number }>()
    return c.json({ ...album, classes: classes ?? [] }, 200)
  } catch {
    return c.json({ error: 'Failed to fetch album' }, 500)
  }
})

export default albumsIdPublic
