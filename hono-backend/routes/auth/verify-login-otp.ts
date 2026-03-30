import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync, isUserSuspendedD1 } from '../../lib/d1-users'

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
  const db = getD1(c)
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))

  if (await isUserSuspendedD1(db, user.id)) {
    await supabase.auth.signOut()
    return c.json({ error: 'Akun Anda sedang disuspend. Silakan hubungi admin.' }, 403)
  }

  const nowIso = new Date().toISOString()
  const row = await db
    .prepare(
      `SELECT user_id FROM login_otps WHERE user_id = ? AND code = ? AND expires_at > ?`
    )
    .bind(user.id, code, nowIso)
    .first<{ user_id: string }>()

  if (row) {
    await db.prepare(`DELETE FROM login_otps WHERE user_id = ?`).bind(user.id).run()
    const role = await getRole(c, user)
    const redirectTo = role === 'admin' ? '/admin' : '/user'
    const isProduction = (c.env as any).NODE_ENV === 'production'
    setCookie(c, OTP_COOKIE_NAME, '1', {
      path: '/',
      maxAge: OTP_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProduction,
    })
    return c.json({ ok: true, redirectTo })
  }

  // Fallback: Supabase verifyOtp (auth saja)
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code,
    type: 'email',
  })

  if (verifyError) {
    const msg =
      verifyError.message === 'Token has expired or is invalid'
        ? 'Kode OTP tidak valid atau sudah kadaluarsa'
        : verifyError.message
    return c.json({ error: msg }, 400)
  }

  const verifiedUser = data?.user ?? user
  await ensureUserInD1(db, verifiedUser, honoEnvForSupabasePublicSync(c.env))
  const role = await getRole(c, verifiedUser)
  const redirectTo = safeNext || (role === 'admin' ? '/admin' : '/user')
  const isProduction = (c.env as any).NODE_ENV === 'production'

  setCookie(c, OTP_COOKIE_NAME, '1', {
    path: '/',
    maxAge: OTP_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProduction,
  })
  return c.json({ ok: true, redirectTo })
})

export default verifyLoginOtp
