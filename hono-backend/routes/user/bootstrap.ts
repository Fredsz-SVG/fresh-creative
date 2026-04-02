import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getD1 } from '../../lib/edge-env'
import { ensureUserStubInD1, getUserRow } from '../../lib/d1-users'
import { requireAuthJwt, getAuthUserId } from '../../middleware'
import { getUserBootstrapCache, setUserBootstrapCache } from '../../lib/user-response-cache'

const OTP_COOKIE_NAME = 'otp_verified'

type OtpEnv = {
  SKIP_OTP?: string
  SKIP_LOGIN_OTP?: string
}

function getSkipOtp(env: OtpEnv): boolean {
  const v = (env?.SKIP_OTP || env?.SKIP_LOGIN_OTP || '')
    .trim()
    .toLowerCase()
    .replace(/^"|"$/g, '')
  return v === 'true' || v === '1' || v === 'yes'
}

const userBootstrap = new Hono()
userBootstrap.use('*', requireAuthJwt)
const USER_BOOTSTRAP_CACHE_TTL_MS = 2000

// GET /api/user/bootstrap
userBootstrap.get('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)

  const userId = await getAuthUserId(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const cached = getUserBootstrapCache(userId)
  if (cached) {
    c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
    c.header('X-Cache', 'HIT')
    return c.json(cached)
  }

  await ensureUserStubInD1(db, userId)
  const me = await getUserRow(db, userId)
  const suspended = (me?.is_suspended ?? 0) === 1

  const skipOtp = getSkipOtp(c.env)
  const cookieVerified = getCookie(c, OTP_COOKIE_NAME) === '1'
  const otpVerified = !suspended && (skipOtp ? true : cookieVerified)

  const notificationsRes = await db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
    .bind(userId)
    .all<Record<string, unknown>>()
  const notifications = notificationsRes.results ?? []
  const unreadCount = notifications.filter((n) => n.is_read !== 1).length

  const payload: Record<string, unknown> = {
    me: {
      id: userId,
      credits: me?.credits ?? 0,
      isSuspended: suspended,
      role: me?.role ?? 'user',
    },
    otp: {
      verified: otpVerified,
      suspended,
    },
    notifications: {
      items: notifications,
      unreadCount,
    },
  }
  setUserBootstrapCache(userId, payload, USER_BOOTSTRAP_CACHE_TTL_MS)
  c.header('Cache-Control', 'private, max-age=2, stale-while-revalidate=10')
  c.header('X-Cache', 'MISS')
  return c.json(payload)
})

export default userBootstrap
