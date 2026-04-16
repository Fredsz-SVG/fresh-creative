import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getD1 } from '../../lib/edge-env'
import { ensureUserStubInD1, getUserRow } from '../../lib/d1-users'
import { requireAuthJwt, getAuthUserId } from '../../middleware'
import { getUserBootstrapCache, setUserBootstrapCache } from '../../lib/user-response-cache'
import { getCreditsFromSupabase, mirrorCreditsToD1 } from '../../lib/credits'

const OTP_COOKIE_NAME = 'otp_verified'

type OtpEnv = {
  SKIP_OTP?: string | boolean
  SKIP_LOGIN_OTP?: string | boolean
  [key: string]: unknown
}

function getSkipOtp(env: OtpEnv | undefined): boolean {
  const val = env?.SKIP_OTP ?? env?.SKIP_LOGIN_OTP
  if (val === true) return true
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase().replace(/^"|"$/g, '')
    return v === 'true' || v === '1' || v === 'yes'
  }
  return false
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
  let credits = 0
  try {
    credits = await getCreditsFromSupabase(c.env as Record<string, string>, userId)
    await mirrorCreditsToD1(db, userId, credits)
  } catch {
    const meFallback = await getUserRow(db, userId)
    credits = meFallback?.credits ?? 0
  }
  const me = await getUserRow(db, userId)
  const suspended = (me?.is_suspended ?? 0) === 1

  const skipOtp = getSkipOtp(c.env as OtpEnv)
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
      credits,
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
