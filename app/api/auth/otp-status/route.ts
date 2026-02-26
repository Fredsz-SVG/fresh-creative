import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const OTP_COOKIE_NAME = 'otp_verified'

/** Di development, OTP di-skip: cukup punya session saja. */
const isDevSkipOtp = process.env.NODE_ENV === 'development'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let suspended = false
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('is_suspended')
      .eq('id', user.id)
      .maybeSingle()
    suspended = !!data?.is_suspended
  }
  const cookieVerified = request.cookies.get(OTP_COOKIE_NAME)?.value === '1'
  const verified = !suspended && (isDevSkipOtp ? !!user : !!(user && cookieVerified))

  return NextResponse.json({
    verified: !!verified,
    suspended,
  })
}
