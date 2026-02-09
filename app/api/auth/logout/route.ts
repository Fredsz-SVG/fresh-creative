import { NextResponse } from 'next/server'

const OTP_COOKIE_NAME = 'otp_verified'

export async function GET() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(OTP_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  })
  return res
}
