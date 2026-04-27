import { Hono } from 'hono'
import { getD1 } from '../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'

const checkUserRoute = new Hono<AppEnv>()
checkUserRoute.use('*', requireAuthJwt)

checkUserRoute.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)

    const user = getAuthUserFromContext(c)
    if (!user) {
      return c.json({ hasRequest: false }, 200)
    }

    const memberAccess = await db
      .prepare(`SELECT 1 FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first()

    if (memberAccess) {
      return c.json(
        { hasRequest: true, status: 'approved', has_paid: 1, payment_status: 'paid' },
        200
      )
    }

    const classAccess = await db
      .prepare(
        `SELECT id, status, has_paid, payment_status FROM album_class_access WHERE album_id = ? AND user_id = ? AND status = 'approved'`
      )
      .bind(albumId, user.id)
      .first<{ id: string; status: string; has_paid?: number; payment_status?: string }>()

    if (classAccess) {
      return c.json(
        {
          hasRequest: true,
          status: 'approved',
          has_paid: classAccess.has_paid ?? 1,
          payment_status: classAccess.payment_status ?? 'paid',
          access_id: classAccess.id,
        },
        200
      )
    }

    const existing = await db
      .prepare(`SELECT id, status FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ id: string; status: string }>()

    if (existing) {
      return c.json({ hasRequest: true, status: existing.status })
    }

    return c.json({ hasRequest: false })
  } catch (error: unknown) {
    console.error('Error checking user request:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default checkUserRoute
