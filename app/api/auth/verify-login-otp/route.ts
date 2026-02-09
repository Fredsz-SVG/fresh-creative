import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

const OTP_COOKIE_NAME = 'otp_verified'
const OTP_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 hari

/**
 * Verifikasi OTP:
 * - Jika ada row di login_otps (mode Resend): cek code, hapus row, set cookie.
 * - Else: pakai Supabase verifyOtp (mode Supabase).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  const code = rawCode.replace(/\D/g, '').slice(0, 6)
  const nextPath = typeof body.next === 'string' ? body.next.trim() : ''
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''

  if (!code) {
    return NextResponse.json({ error: 'Kode OTP wajib diisi' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient() ?? supabase
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
    const res = NextResponse.json({ ok: true, redirectTo })
    res.cookies.set(OTP_COOKIE_NAME, '1', {
      path: '/',
      maxAge: OTP_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  }

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code,
    type: 'email',
  })

  if (verifyError) {
    return NextResponse.json(
      { error: verifyError.message === 'Token has expired or is invalid' ? 'Kode OTP tidak valid atau sudah kadaluarsa' : verifyError.message },
      { status: 400 }
    )
  }

  const verifiedUser = data?.user ?? user
  const role = await getRole(supabase, verifiedUser)
  const redirectTo = safeNext || (role === 'admin' ? '/admin' : '/user')

  const res = NextResponse.json({ ok: true, redirectTo })
  res.cookies.set(OTP_COOKIE_NAME, '1', {
    path: '/',
    maxAge: OTP_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
