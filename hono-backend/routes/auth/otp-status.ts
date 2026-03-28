import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getSupabaseClient } from '../../lib/supabase'

const OTP_COOKIE_NAME = 'otp_verified'

function getSkipOtp(env: any): boolean {
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
    const { data } = await supabase
      .from('users')
      .select('is_suspended')
      .eq('id', user.id)
      .maybeSingle()
    suspended = !!data?.is_suspended
  }
  const skipOtp = getSkipOtp(c.env)
  const cookieVerified = getCookie(c, OTP_COOKIE_NAME) === '1'
  const verified = !suspended && (skipOtp ? !!user : !!(user && cookieVerified))

  return c.json({ verified: !!verified, suspended })
})

export default authOtpStatus