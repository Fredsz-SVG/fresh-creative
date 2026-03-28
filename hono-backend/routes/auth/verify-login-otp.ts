import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'

const OTP_COOKIE_NAME = 'otp_verified'
const OTP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const verifyLoginOtp = new Hono()

verifyLoginOtp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  const code = rawCode.replace(/\D/g, '').slice(0, 6)
  const nextPath = typeof body.next === 'string' ? body.next.trim() : ''
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''

  if (!code) {
    return c.json({ error: 'Kode OTP wajib diisi' }, 400)
  }

  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_suspended')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_suspended) {
    await supabase.auth.signOut()
    return c.json({ error: 'Akun Anda sedang disuspend. Silakan hubungi admin.' }, 403)
  }

  let db: any
  try { db = getAdminSupabaseClient(c?.env as any) } catch { db = supabase }

  const { data: row } = await db
    .from('login_otps')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (row) {
    await db.from('login_otps').delete().eq('user_id', user.id)
    const role = await getRole(supabase, user)
    const redirectTo = role === 'admin' ? '/admin' : '/user'
    const isProduction = (c.env as any).NODE_ENV === 'production'
    setCookie(c, OTP_COOKIE_NAME, '1', {
      path: '/', maxAge: OTP_COOKIE_MAX_AGE, httpOnly: true,
      sameSite: 'Lax', secure: isProduction,
    })
    return c.json({ ok: true, redirectTo })
  }

  // Fallback: Supabase verifyOtp
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email, token: code, type: 'email',
  })

  if (verifyError) {
    const msg = verifyError.message === 'Token has expired or is invalid'
      ? 'Kode OTP tidak valid atau sudah kadaluarsa' : verifyError.message
    return c.json({ error: msg }, 400)
  }

  const verifiedUser = data?.user ?? user
  const role = await getRole(supabase, verifiedUser)
  const redirectTo = safeNext || (role === 'admin' ? '/admin' : '/user')
  const isProduction = (c.env as any).NODE_ENV === 'production'

  setCookie(c, OTP_COOKIE_NAME, '1', {
    path: '/', maxAge: OTP_COOKIE_MAX_AGE, httpOnly: true,
    sameSite: 'Lax', secure: isProduction,
  })
  return c.json({ ok: true, redirectTo })
})

export default verifyLoginOtp