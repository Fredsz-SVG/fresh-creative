import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { logApiTiming } from '@/lib/api-timing'

// GET /api/albums/[id]/join-requests - List all join requests for album
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const start = performance.now()
  const { id: albumId } = await context.params
  try {
    const supabase = await createClient()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') // 'pending', 'approved', 'rejected', or 'all'

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Special handling for approved status
    // Approved requests are moved to album_class_access and deleted from album_join_requests
    if (status === 'approved') {
      const adminClient = createAdminClient()
      const client = adminClient || supabase

      const { data: approvedData, error: approvedError } = await client
        .from('album_class_access')
        .select('id, album_id, user_id, student_name, email, class_id, status, created_at, album_classes!inner(name)')
        .eq('album_id', albumId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (approvedError) throw approvedError

      // Transform data to match join_requests format
      const transformed = approvedData?.map((access: any) => ({
        id: access.id,
        album_id: access.album_id,
        user_id: access.user_id,
        student_name: access.student_name,
        email: access.email,
        phone: null, // Not stored in album_class_access
        class_name: access.album_classes?.name || 'Unknown',
        assigned_class_id: access.class_id,
        status: 'approved',
        requested_at: access.created_at,
        approved_at: access.created_at,
        approved_by: null
      })) || []

      return NextResponse.json(transformed)
    }

    // For pending/rejected/all, query album_join_requests
    let query = supabase
      .from('album_join_requests')
      .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
      .eq('album_id', albumId)
      .order('requested_at', { ascending: false })

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    )
  } finally {
    logApiTiming('GET', `/api/albums/${albumId}/join-requests`, start)
  }
}

// POST /api/albums/[id]/join-requests - Submit a join request (requires auth)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params

    const body = await request.json()
    const { student_name, class_name, email, phone } = body

    if (!student_name || !email) {
      return NextResponse.json(
        { error: 'Nama dan email wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - silakan login terlebih dahulu' },
        { status: 401 }
      )
    }


    // Use admin client to check album (bypass RLS)
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Check if album exists and get capacity
    const { data: album, error: albumError } = await adminClient
      .from('albums')
      .select('id, students_count, name')
      .eq('id', albumId)
      .maybeSingle()

    if (albumError || !album) {
      console.error('[JOIN-REQUEST] Album not found:', albumError)
      return NextResponse.json(
        { error: 'Album tidak ditemukan' },
        { status: 404 }
      )
    }


    // Check capacity using admin client
    const { data: stats, error: statsError } = await adminClient.rpc('get_album_join_stats', {
      _album_id: albumId
    })

    if (statsError) {
      console.error('[JOIN-REQUEST] Stats error:', statsError)
    }

    if (stats && stats.length > 0) {
      const { available_slots } = stats[0]
      if (available_slots <= 0) {
        return NextResponse.json(
          { error: 'Maaf, album sudah penuh. Tidak bisa menerima pendaftaran lagi.' },
          { status: 400 }
        )
      }
    }

    // Check if user already has a request for this album (use admin client for read)
    const { data: existing } = await adminClient
      .from('album_join_requests')
      .select('id, status, email')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Anda sudah mendaftar dan menunggu persetujuan' },
          { status: 400 }
        )
      } else if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'Anda sudah terdaftar dan disetujui' },
          { status: 400 }
        )
      } else if (existing.status === 'rejected') {
        // If rejected, update the existing record to pending (re-register)
        const { data: updated_data, error: updateError } = await adminClient
          .from('album_join_requests')
          .update({
            student_name,
            class_name: class_name || null,
            email,
            phone: phone || null,
            status: 'pending',
            requested_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()

        if (updateError) {
          console.error('[JOIN-REQUEST] Update error:', updateError)
          return NextResponse.json(
            { error: updateError.message || 'Gagal mendaftar ulang' },
            { status: 500 }
          )
        }

        // Notification
        await adminClient.from('notifications').insert({
          user_id: user.id,
          title: 'Status Pendaftaran Album',
          message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
          type: 'info',
          metadata: { status: 'Menunggu Persetujuan' }
        })

        return NextResponse.json({
          success: true,
          message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
          data: updated_data?.[0]
        })
      }
    }

    // Insert new request with authenticated user ID
    const { data: request_data, error: insertError } = await supabase
      .from('album_join_requests')
      .insert({
        album_id: albumId,
        user_id: user.id,
        student_name,
        class_name: class_name || null,
        email,
        phone: phone || null,
        status: 'pending'
      })
      .select()

    if (insertError) {
      console.error('[JOIN-REQUEST] Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Gagal mendaftar' },
        { status: 500 }
      )
    }

    // Notification
    await adminClient.from('notifications').insert({
      user_id: user.id,
      title: 'Status Pendaftaran Album',
      message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
      type: 'info',
      metadata: { status: 'Menunggu Persetujuan' }
    })

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
      data: request_data?.[0]
    })
  } catch (error: any) {
    console.error('[JOIN-REQUEST] Error submitting join request:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
