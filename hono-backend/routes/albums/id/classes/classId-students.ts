import { Hono } from 'hono'
import { getD1 } from '../../../../lib/edge-env'
import { parseJsonArray } from '../../../../lib/d1-json'
import { AppEnv, requireAuthJwt } from '../../../../middleware'
import { getAuthUserFromContext } from '../../../../lib/auth-user'

const classStudentsRoute = new Hono<AppEnv>()
classStudentsRoute.use('*', requireAuthJwt)

classStudentsRoute.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const cls = await db
    .prepare(`SELECT id, album_id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string; album_id: string }>()

  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const { results: accessList } = await db
    .prepare(`SELECT student_name, photos FROM album_class_access WHERE class_id = ?`)
    .bind(classId)
    .all<{ student_name: string; photos: string }>()

  const students = (accessList || [])
    .map((r) => {
      const photos = parseJsonArray(r.photos) as unknown[]
      return {
        student_name: r.student_name,
        photo_count: photos.length,
      }
    })
    .filter((s) => s.photo_count > 0)

  students.sort((a, b) => a.student_name.localeCompare(b.student_name))
  return c.json(students)
})

export default classStudentsRoute
