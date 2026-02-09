import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const OTP_EXPIRY_MINUTES = 10
const OTP_LENGTH = 6

function generateOtp(): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

/**
 * Kirim OTP:
 * - Jika RESEND_API_KEY ada: generate OTP, simpan di login_otps, kirim via Resend (tidak kena limit 2/jam Supabase).
 * - Jika tidak: pakai Supabase signInWithOtp (limit 2 email/jam project).
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (apiKey) {
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
    const db = createAdminClient() ?? supabase

    const { error: upsertError } = await db
      .from('login_otps')
      .upsert(
        { user_id: user.id, code, expires_at: expiresAt },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
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
        return NextResponse.json(
          { error: resendError.message || 'Gagal mengirim email OTP' },
          { status: 500 }
        )
      }
    } catch (err) {
      console.error('Resend send error:', err)
      return NextResponse.json({ error: 'Gagal mengirim email OTP' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
