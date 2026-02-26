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
    const message = error === 'access_denied' && requestUrl.searchParams.get('error_code') === 'otp_expired'
      ? 'Link konfirmasi sudah kadaluarsa atau tidak valid. Silakan login dan minta kirim ulang email konfirmasi, atau daftar lagi.'
      : (errorDescription || error)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
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
      const { data: profile } = await supabase
        .from('users')
        .select('is_suspended')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_suspended) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=account_suspended', requestUrl.origin))
      }
    }

    const verifyUrl = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? `/auth/verify-otp?next=${encodeURIComponent(nextPath)}`
      : '/auth/verify-otp'
    return NextResponse.redirect(new URL(verifyUrl, requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
