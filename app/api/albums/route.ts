import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: Fetch albums (Admin sees all, User sees own)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json([], { status: 200 })
    }

    let role: 'admin' | 'user' = 'user'
    try {
      role = await getRole(supabase, user)
    } catch {
      // ignore
    }
    const isAdmin = role === 'admin'

    // Admin: Fetch ALL albums
    if (isAdmin) {
      const adminClient = createAdminClient()
      if (!adminClient) {
        return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
      }

      const { data: albums, error } = await adminClient
        .from('albums')
        .select(`
          id, name, type, status, created_at, 
          pricing_package_id, 
          pricing_packages(name), 
          school_city, kab_kota, wa_e164, province_id, province_name, pic_name, students_count, source, total_estimated_price
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/albums] admin error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Map to frontend expected format
      const result = (albums ?? []).map((a: any) => {
        const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
        return {
          ...a,
          pricing_packages: pkg,
          isOwner: false // Admin view
        }
      })

      return NextResponse.json(result)
    }

    // User: Fetch OWN albums + Member albums
    const { data: ownedAlbums, error: ownedErr } = await supabase
      .from('albums')
      .select('*, pricing_packages(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (ownedErr) {
      return NextResponse.json({ error: ownedErr.message }, { status: 500 })
    }

    // Member albums
    const { data: memberRows } = await supabase.from('album_members').select('album_id').eq('user_id', user.id)
    const memberAlbumIds = (memberRows ?? []).map((r: { album_id: string }) => r.album_id).filter(Boolean)

    let memberAlbums: any[] = []
    if (memberAlbumIds.length > 0) {
      const { data } = await supabase
        .from('albums')
        .select('*, pricing_packages(name)')
        .in('id', memberAlbumIds)
      memberAlbums = data ?? []
    }

    const ownedSet = new Set((ownedAlbums ?? []).map(a => a.id))
    const finalAlbums = [
      ...(ownedAlbums ?? []).map(a => ({ ...a, isOwner: true })),
      ...memberAlbums.filter(a => !ownedSet.has(a.id)).map(a => ({ ...a, isOwner: false }))
    ]

    // Sort combined
    finalAlbums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Normalize pricing_packages
    const normalized = finalAlbums.map((a: any) => {
      const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
      return { ...a, pricing_packages: pkg }
    })

    return NextResponse.json(normalized)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/albums]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: Create new album (Public OR Yearbook from Showroom)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type = 'yearbook', name, school_name } = body

  // Data to insert
  const dataToInsert: any = {
    user_id: user.id,
    type: type,
    status: 'pending', // Default pending
  }

  if (type === 'yearbook') {
    // Expect detailed lead data
    // Use school_name if provided, else name
    const finalName = (school_name || name || '').trim()
    if (!finalName) {
      return NextResponse.json({ error: 'Nama sekolah wajib.' }, { status: 400 })
    }

    dataToInsert.name = finalName
    dataToInsert.school_city = body.school_city
    dataToInsert.kab_kota = body.kab_kota
    dataToInsert.wa_e164 = body.wa_e164
    dataToInsert.province_id = body.province_id
    dataToInsert.province_name = body.province_name
    dataToInsert.pic_name = body.pic_name
    dataToInsert.students_count = body.students_count
    dataToInsert.source = body.source || 'showroom'
    dataToInsert.pricing_package_id = body.pricing_package_id
    dataToInsert.total_estimated_price = body.total_estimated_price

  } else if (type === 'public') {
    if (!name) {
      return NextResponse.json({ error: 'Nama album wajib.' }, { status: 400 })
    }
    dataToInsert.name = name
    dataToInsert.status = 'approved'
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('albums')
    .insert(dataToInsert)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT: Update status (Approve/Decline)
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await getRole(supabase, user)
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'id dan status wajib' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })

  const { data, error } = await adminClient
    .from('albums')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: Delete album
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Album ID is required' }, { status: 400 })

  const role = await getRole(supabase, user)

  if (role === 'admin') {
    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    const { error } = await admin.from('albums').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // User can only delete OWN albums
    const { error } = await supabase.from('albums').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Album deleted successfully' })
}
