import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'

const OTP_EXPIRY_MINUTES = 5

type OtpSkipEnv = {
  SKIP_OTP?: string | boolean
  SKIP_LOGIN_OTP?: string | boolean
  [key: string]: unknown
}

function getSkipOtp(env: OtpSkipEnv | undefined): boolean {
  const val = env?.SKIP_OTP ?? env?.SKIP_LOGIN_OTP;
  if (val === true) return true;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase().replace(/^"|"$/g, '');
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}

type ResendEnv = {
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
}

type ResendErrorLike = {
  message?: string
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const sendLoginOtp = new Hono()

sendLoginOtp.post('/', async (c) => {
  // Dev mode: benar-benar skip OTP flow (hindari 500 saat tabel/login_otps belum siap).
  if (getSkipOtp(c.env as OtpSkipEnv)) {
    return c.json({ ok: true, skipped: true })
  }

  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const db0 = getD1(c)
  if (db0) await ensureUserInD1(db0, user, honoEnvForSupabasePublicSync(c.env))

  const env = c.env as ResendEnv
  const apiKey = env.RESEND_API_KEY
  const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (apiKey) {
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
    const db = getD1(c)
    if (!db) {
      return c.json({ error: 'Database not configured' }, 503)
    }

    const r = await db
      .prepare(
        `INSERT INTO login_otps (user_id, code, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, created_at = datetime('now')`
      )
      .bind(user.id, code, expiresAt)
      .run()

    if (!r.success) {
      return c.json({ error: 'Gagal menyimpan OTP' }, 500)
    }

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'Kode OTP masuk dashboard',
        html: `<p>Kode OTP Anda: <strong>${code}</strong></p><p>Berlaku ${OTP_EXPIRY_MINUTES} menit.</p>`,
      })
      if (resendError) {
        console.error('Resend API error:', resendError)
        const message = (resendError as ResendErrorLike).message || 'Gagal mengirim email OTP'
        return c.json({ error: message }, 500)
      }
    } catch (err) {
      console.error('Resend send error:', err)
      return c.json({ error: 'Gagal mengirim email OTP' }, 500)
    }
    return c.json({ ok: true })
  }

  // Fallback: Supabase OTP
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  })
  if (error) {
    return c.json({ error: error.message }, 400)
  }
  return c.json({ ok: true })
})

export default sendLoginOtp