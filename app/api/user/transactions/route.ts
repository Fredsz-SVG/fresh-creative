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
    .select('id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('User transactions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (Array.isArray(data) ? data : []).map((row: any) => {
    const { credit_packages, albums, ...rest } = row
    // Supabase can return object or array, handle both just in case
    const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
    const album = Array.isArray(albums) ? albums[0] : albums
    return {
      ...rest,
      credits: pkg?.credits ?? null,
      album_name: album?.name ?? null
    }
  })
  return NextResponse.json(list)
}
