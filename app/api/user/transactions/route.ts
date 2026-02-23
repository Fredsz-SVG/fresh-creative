import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient
    .from('transactions')
    .select('id, external_id, amount, status, invoice_url, created_at, credit_packages(credits)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('User transactions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (Array.isArray(data) ? data : []).map((row: { credit_packages?: { credits: number } | null; [k: string]: unknown }) => {
    const { credit_packages, ...rest } = row
    return { ...rest, credits: credit_packages?.credits ?? null }
  })
  return NextResponse.json(list)
}
