import { Hono } from 'hono'
import { getD1 } from '../../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../../middleware'
import { getAuthUserFromContext } from '../../../../lib/auth-user'

const myRequestRoute = new Hono<AppEnv>()
myRequestRoute.use('*', requireAuthJwt)

myRequestRoute.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const request_data = await db
    .prepare(
      `SELECT id, student_name, email, status, requested_at FROM album_join_requests
       WHERE assigned_class_id = ? AND user_id = ? AND album_id = ?`
    )
    .bind(classId, user.id, albumId)
    .first<Record<string, unknown>>()

  return c.json({ request: request_data ?? null })
})

export default myRequestRoute
