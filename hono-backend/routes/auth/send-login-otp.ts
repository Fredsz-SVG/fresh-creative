import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const OTP_EXPIRY_MINUTES = 5

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const sendLoginOtp = new Hono()

sendLoginOtp.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const apiKey = (c.env as any).RESEND_API_KEY
  const fromEmail = (c.env as any).RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (apiKey) {
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
    let db: any
    try { db = getAdminSupabaseClient(c?.env as any) } catch { db = supabase }

    const { error: upsertError } = await db
      .from('login_otps')
      .upsert({ user_id: user.id, code, expires_at: expiresAt }, { onConflict: 'user_id' })

    if (upsertError) {
      return c.json({ error: upsertError.message }, 500)
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
        return c.json({ error: (resendError as any).message || 'Gagal mengirim email OTP' }, 500)
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