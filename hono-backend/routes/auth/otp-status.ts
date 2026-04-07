import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getD1 } from '../../lib/edge-env'
import { isUserSuspendedD1 } from '../../lib/d1-users'
import { getAuthUserId } from '../../middleware'

const OTP_COOKIE_NAME = 'otp_verified'

type OtpEnv = {
  SKIP_OTP?: string | boolean
  SKIP_LOGIN_OTP?: string | boolean
  [key: string]: unknown
}

function getSkipOtp(env: OtpEnv | undefined): boolean {
  const val = env?.SKIP_OTP ?? env?.SKIP_LOGIN_OTP;
  if (val === true) return true;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase().replace(/^"|"$/g, '');
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}

const authOtpStatus = new Hono()

// GET /api/auth/otp-status
authOtpStatus.get('/', async (c) => {
  const skipOtp = getSkipOtp(c.env)
  const userId = await getAuthUserId(c)

  // Dev / local: kalau OTP di-skip, jangan sentuh D1 sama sekali (hindari 500 saat binding/table belum siap).
  if (skipOtp) {
    return c.json({ verified: !!userId, suspended: false })
  }

  let suspended = false
  if (userId) {
    try {
      const db = getD1(c)
      if (db) suspended = await isUserSuspendedD1(db, userId)
    } catch (err) {
      console.error('otp-status: failed to check suspension', err)
      suspended = false
    }
  }
  const cookieVerified = getCookie(c, OTP_COOKIE_NAME) === '1'
  const verified = !suspended && (skipOtp ? !!userId : !!(userId && cookieVerified))

  return c.json({ verified: !!verified, suspended })
})

export default authOtpStatus