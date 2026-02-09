import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const OTP_COOKIE_NAME = 'otp_verified'

/** Di development, OTP di-skip: cukup punya session saja. */
const isDevSkipOtp = process.env.NODE_ENV === 'development'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieVerified = request.cookies.get(OTP_COOKIE_NAME)?.value === '1'
  const verified = isDevSkipOtp ? !!user : !!(user && cookieVerified)

  return NextResponse.json({
    verified: !!verified,
  })
}
