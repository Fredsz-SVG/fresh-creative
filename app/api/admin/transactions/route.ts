import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Riwayat sendiri (default)
  if (scope !== 'all') {
    const { data, error } = await adminClient
      .from('transactions')
      .select('id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin own transactions fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const list = (Array.isArray(data) ? data : []).map((row: any) => {
      const { credit_packages, albums, ...rest } = row
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

  // Riwayat semua user (dengan detail nama, email, credits)
  const { data: rows, error } = await adminClient
    .from('transactions')
    .select('id, user_id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Admin all transactions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) {
    return NextResponse.json([])
  }

  const userIds = [...new Set(list.map((r: { user_id: string }) => r.user_id))]
  const { data: users } = await adminClient
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map((u: { id: string; full_name: string | null; email: string }) => [u.id, { full_name: u.full_name || '-', email: u.email || '-' }]))

  const result = list.map((tx: any) => {
    const u = userMap.get(tx.user_id) || { full_name: '-', email: '-' }
    const { credit_packages, albums, ...rest } = tx
    const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
    const album = Array.isArray(albums) ? albums[0] : albums
    return {
      ...rest,
      credits: pkg?.credits ?? null,
      album_name: album?.name ?? null,
      user_full_name: u.full_name,
      user_email: u.email,
    }
  })

  return NextResponse.json(result)
}
