import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { getRole } from '../../lib/auth'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, isUserSuspendedD1 } from '../../lib/d1-users'
import { AppEnv, requireAuthJwt } from '../../middleware'

const OTP_COOKIE_NAME = 'otp_verified'
const OTP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

type AuthEnv = {
  NODE_ENV?: string
}

const verifyLoginOtp = new Hono<AppEnv>()
verifyLoginOtp.use('*', requireAuthJwt)

verifyLoginOtp.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  const code = rawCode.replace(/\D/g, '').slice(0, 6)
  const nextPath = typeof body.next === 'string' ? body.next.trim() : ''
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''

  if (!code) {
    return c.json({ error: 'Kode OTP wajib diisi' }, 400)
  }

  const db = getD1(c)
  if (!db) {
    return c.json({ error: 'Database not configured' }, 503)
  }

  const authUser = c.get('user')
  const userId = authUser?.id
  const email = authUser?.email ?? ''
  if (!userId || !email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await ensureUserInD1(db, {
    id: userId,
    email,
    user_metadata: {},
    app_metadata: authUser?.role ? { role: authUser.role } : {},
  })

  if (await isUserSuspendedD1(db, userId)) {
    return c.json({ error: 'Akun Anda sedang disuspend. Silakan hubungi admin.' }, 403)
  }

  const nowIso = new Date().toISOString()
  const row = await db
    .prepare(`SELECT user_id FROM login_otps WHERE user_id = ? AND code = ? AND expires_at > ?`)
    .bind(userId, code, nowIso)
    .first<{ user_id: string }>()

  if (row) {
    await db.prepare(`DELETE FROM login_otps WHERE user_id = ?`).bind(userId).run()
    const role = await getRole(c, { id: userId, user_metadata: {}, app_metadata: {} } as any)
    let finalNext = safeNext
    if (role === 'admin' && finalNext.startsWith('/user')) {
      finalNext = finalNext.replace('/user', '/admin')
    }
    const redirectTo = finalNext || (role === 'admin' ? '/admin' : '/user')
    const isProduction = (c.env as AuthEnv).NODE_ENV === 'production'
    setCookie(c, OTP_COOKIE_NAME, '1', {
      path: '/',
      maxAge: OTP_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProduction,
    })
    return c.json({ ok: true, redirectTo })
  }

  return c.json({ error: 'Kode OTP tidak valid atau sudah kadaluarsa' }, 400)
})

export default verifyLoginOtp
