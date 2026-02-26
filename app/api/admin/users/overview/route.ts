import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cookieStore = await cookies()

  const authClient = createServerClient(
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

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') ?? '').trim()
  const pageParam = parseInt(url.searchParams.get('page') ?? '1', 10)
  const perPageParam = parseInt(url.searchParams.get('perPage') ?? '10', 10)
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
  const perPage = Number.isNaN(perPageParam) || perPageParam < 1 ? 10 : perPageParam

  try {
    const authUsers = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (!authUsers.error && authUsers.data?.users?.length) {
      const rows = authUsers.data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: (u.user_metadata?.full_name as string | undefined) ?? null,
      }))
      await adminClient
        .from('users')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    }

    const { count: totalUsers, error: countError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const { count: totalAdmins, error: adminCountError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (adminCountError) {
      return NextResponse.json({ error: adminCountError.message }, { status: 500 })
    }

    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { count: newUsers7d, error: newUsersError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString())

    if (newUsersError) {
      return NextResponse.json({ error: newUsersError.message }, { status: 500 })
    }

    const { data: creditRows, error: creditsError } = await adminClient
      .from('users')
      .select('credits')

    if (creditsError) {
      return NextResponse.json({ error: creditsError.message }, { status: 500 })
    }

    const totalCredits = (creditRows ?? []).reduce(
      (sum, row) => sum + (typeof row.credits === 'number' ? row.credits : 0),
      0
    )

    let listQuery = adminClient
      .from('users')
      .select('id, email, full_name, role, credits, created_at, is_suspended', { count: 'exact' })

    if (search) {
      listQuery = listQuery.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%`
      )
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data: latestUsers, error: latestError, count } = await listQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (latestError) {
      return NextResponse.json({ error: latestError.message }, { status: 500 })
    }

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalAdmins: totalAdmins ?? 0,
      totalCredits,
      newUsers7d: newUsers7d ?? 0,
      latestUsers: latestUsers ?? [],
      page,
      perPage,
      total: count ?? latestUsers?.length ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load overview' }, { status: 500 })
  }
}

async function getClients() {
  const cookieStore = await cookies()

  const authClient = createServerClient(
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

  const adminClient = createAdminClient()
  if (!adminClient) {
    return { errorResponse: NextResponse.json({ error: 'Service role not configured' }, { status: 500 }) }
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { errorResponse: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (profile?.role !== 'admin') {
    return { errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { adminClient }
}

export async function PUT(request: Request) {
  const clients = await getClients()
  if ('errorResponse' in clients) return clients.errorResponse

  const { adminClient } = clients

  const body = await request.json().catch(() => null)
  const id = body?.id as string | undefined
  const credits = body?.credits
  const role = body?.role as string | undefined
  const isSuspended = body?.isSuspended as boolean | undefined

  if (!id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const update: Record<string, any> = {}

  if (typeof credits === 'number') {
    if (credits < 0) {
      return NextResponse.json({ error: 'Credits must be >= 0' }, { status: 400 })
    }
    update.credits = credits
  }

  if (role === 'admin' || role === 'user') {
    update.role = role
  } else if (role !== undefined) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (typeof isSuspended === 'boolean') {
    update.is_suspended = isSuspended
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id, email, full_name, role, credits, created_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const clients = await getClients()
  if ('errorResponse' in clients) return clients.errorResponse

  const { adminClient } = clients

  const body = await request.json().catch(() => null)
  const id = body?.id as string | undefined

  if (!id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await adminClient.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
