import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Auth callback: dipanggil setelah user klik link konfirmasi email (atau OAuth).
 * - ?code=... → tukar code untuk session, redirect ke /admin atau /user
 * - ?error=... → redirect ke /login dengan pesan error (mis. otp_expired)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    let message = errorDescription || error
    if (error === 'access_denied' && requestUrl.searchParams.get('error_code') === 'otp_expired') {
      message = 'Link konfirmasi sudah digunakan atau kadaluarsa. Jika Anda sudah berhasil mendaftar sebelumnya, silakan langsung login.'
    } else if (message.toLowerCase().includes('invalid flow state')) {
      message = 'Link konfirmasi tidak valid. Jika Anda mengklik link dari email, email Anda mungkin sudah terverifikasi (oleh sistem pemeriksa link otomatis di email Anda). Silakan coba langsung login dengan email dan password Anda.'
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      let errorMessage = exchangeError.message
      if (errorMessage.toLowerCase().includes('invalid flow state') || errorMessage.toLowerCase().includes('already been used')) {
        errorMessage = 'Link konfirmasi sudah digunakan atau tidak valid. Jika Anda sedang mendaftar, email Anda mungkin sudah terverifikasi. Silakan coba untuk Login.'
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
      )
    }

    const nextPath = requestUrl.searchParams.get('next')
    if (nextPath === '/reset-password') {
      return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
    }

    // Sinkronkan ke public.users (langsung tersimpan saat konfirmasi email)
    await supabase.rpc('sync_user_from_auth')

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const type = requestUrl.searchParams.get('type')
      const createdAt = new Date(user.created_at).getTime()
      const now = Date.now()
      const isNewUser = (now - createdAt) < 1000 * 60 // Kurang dari 1 menit

      if (type === 'login' && isNewUser && user.app_metadata?.provider === 'google') {
        // User mencoba "Login dengan Google" tapi belum terdaftar.
        // Karena Supabase otomatis membuat akun, kita harus HAPUS akunnya lagi.
        const { createAdminClient } = await import('@/lib/supabase-admin')
        const adminDb = createAdminClient()
        if (adminDb) {
          await adminDb.from('users').delete().eq('id', user.id)
          await adminDb.auth.admin.deleteUser(user.id)
        }
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=Akun+belum+terdaftar.+Silakan+Sign+Up+terlebih+dahulu.', requestUrl.origin))
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_suspended')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_suspended) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=account_suspended', requestUrl.origin))
      }

      // Paksa user untuk login ulang secara manual walaupun session sudah terbuat
      // Ini berlaku untuk verifikasi lewat email. Login lwt OAuth/Google akan skip block ini
      if (user.app_metadata?.provider === 'email') {
        await supabase.auth.signOut()
        const verifyUrl = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
          ? `/login?verified=true&next=${encodeURIComponent(nextPath)}`
          : '/login?verified=true'
        return NextResponse.redirect(new URL(verifyUrl, requestUrl.origin))
      }

      // Untuk Google OAuth (login atau signup yang otomatis terverifikasi):
      let finalUrl = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/user/portal'
      if (type === 'signup' && isNewUser) {
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&toast=google_signup_success` : `${finalUrl}?toast=google_signup_success`
      }
      return NextResponse.redirect(new URL(finalUrl, requestUrl.origin))
    }

    // Jika tidak ada user terdeteksi (meskipun jarang terjadi jika sukses exchange)
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
