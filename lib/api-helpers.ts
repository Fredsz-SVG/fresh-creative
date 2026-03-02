import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Helper: buat Supabase auth client (anon key, dengan cookie)
 */
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Helper: buat Supabase service role client (tanpa cookie, bypass RLS)
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Helper: buat Supabase service role client dengan cookie (untuk admin ops yang perlu auth context)
 */
export async function createServiceClientWithCookies() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Helper: autentikasi user dan return user object, atau error response
 */
export async function requireAuth() {
  const supabase = await createAuthClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, supabase }
}

/**
 * Helper: autentikasi user + cek role admin
 */
export async function requireAdmin() {
  const auth = await requireAuth()
  if ('error' in auth) return auth

  const { user, supabase } = auth
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, supabase }
}

/**
 * Helper: JSON error response
 */
export function jsonError(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

/**
 * Helper: JSON success response
 */
export function jsonOk(data: any = { ok: true }) {
  return NextResponse.json(data)
}
