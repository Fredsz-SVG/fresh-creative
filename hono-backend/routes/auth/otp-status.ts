import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getD1 } from '../../lib/edge-env'
import { isUserSuspendedD1 } from '../../lib/d1-users'
import { getAuthUserId } from '../../middleware'

const OTP_COOKIE_NAME = 'otp_verified'

type OtpEnv = {
  SKIP_OTP?: string
  SKIP_LOGIN_OTP?: string
}

function getSkipOtp(env: OtpEnv): boolean {
  const v = (env?.SKIP_OTP || env?.SKIP_LOGIN_OTP || '').trim().toLowerCase().replace(/^"|"$/g, '')
  return v === 'true' || v === '1' || v === 'yes'
}

const authOtpStatus = new Hono()

// GET /api/auth/otp-status
authOtpStatus.get('/', async (c) => {
  const userId = await getAuthUserId(c)
  let suspended = false
  if (userId) {
    const db = getD1(c)
    if (db) suspended = await isUserSuspendedD1(db, userId)
  }
  const skipOtp = getSkipOtp(c.env)
  const cookieVerified = getCookie(c, OTP_COOKIE_NAME) === '1'
  const verified = !suspended && (skipOtp ? !!userId : !!(userId && cookieVerified))

  return c.json({ verified: !!verified, suspended })
})

export default authOtpStatus