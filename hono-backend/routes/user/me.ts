import { Hono } from 'hono'
import { getD1 } from '../../lib/edge-env'
import { ensureUserStubInD1, getUserRow } from '../../lib/d1-users'
import { requireAuthJwt, getAuthUserId } from '../../middleware'
import { getUserMeCache, setUserMeCache } from '../../lib/user-response-cache'
import { getCreditsFromD1 } from '../../lib/credits'

const userMe = new Hono()
userMe.use('*', requireAuthJwt)
const USER_ME_CACHE_TTL_MS = 2500

// GET /api/user/me
userMe.get('/', async (c) => {
  const db = getD1(c)
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }

  const userId = await getAuthUserId(c)
  if (!userId) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const cached = getUserMeCache(userId)
  if (cached) {
    c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
    c.header('X-Cache', 'HIT')
    return c.json(cached)
  }

  await ensureUserStubInD1(db, userId)
  const credits = await getCreditsFromD1(db, userId)
  const row = await getUserRow(db, userId)
  const payload = {
    id: userId,
    credits,
    isSuspended: (row?.is_suspended ?? 0) === 1,
  }
  setUserMeCache(userId, payload, USER_ME_CACHE_TTL_MS)
  c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
  c.header('X-Cache', 'MISS')
  return c.json(payload)
})

export default userMe
