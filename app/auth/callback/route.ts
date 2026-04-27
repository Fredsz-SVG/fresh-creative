import { NextRequest, NextResponse } from 'next/server'

/**
 * Legacy auth callback (Supabase).
 *
 * Project ini sudah migrasi ke **Firebase Auth-only**, jadi route ini hanya untuk:
 * - menjaga link lama tidak 404
 * - mengarahkan user ke halaman yang relevan (login / reset-password)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const nextPath = requestUrl.searchParams.get('next')

  if (error) {
    let message = errorDescription || error
    if (error === 'access_denied' && requestUrl.searchParams.get('error_code') === 'otp_expired') {
      message = 'Link konfirmasi sudah digunakan atau kadaluarsa. Silakan login kembali.'
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin))
  }

  if (nextPath === '/reset-password') {
    return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
