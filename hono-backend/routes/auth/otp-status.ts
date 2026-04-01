import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { isUserSuspendedD1 } from '../../lib/d1-users'

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
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  let suspended = false
  if (user) {
    const db = getD1(c)
    if (db) suspended = await isUserSuspendedD1(db, user.id)
  }
  const skipOtp = getSkipOtp(c.env)
  const cookieVerified = getCookie(c, OTP_COOKIE_NAME) === '1'
  const verified = !suspended && (skipOtp ? !!user : !!(user && cookieVerified))

  return c.json({ verified: !!verified, suspended })
})

export default authOtpStatus