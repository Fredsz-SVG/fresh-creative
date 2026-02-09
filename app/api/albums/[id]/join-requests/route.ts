import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/albums/[id]/join-requests - List all join requests for album
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params
    const supabase = await createClient()
    
    const url = new URL(request.url)
    const status = url.searchParams.get('status') // 'pending', 'approved', 'rejected', or 'all'
    
    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('album_join_requests')
      .select('*')
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
  }
}

// POST /api/albums/[id]/join-requests - Submit a join request (no auth required)
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

    // Check if album exists and get capacity
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, students_count')
      .eq('id', albumId)
      .maybeSingle()

    if (albumError || !album) {
      return NextResponse.json(
        { error: 'Album tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check capacity
    const { data: stats } = await supabase.rpc('get_album_join_stats', {
      _album_id: albumId
    })

    if (stats && stats.length > 0) {
      const { available_slots } = stats[0]
      if (available_slots <= 0) {
        return NextResponse.json(
          { error: 'Maaf, album sudah penuh. Tidak bisa menerima pendaftaran lagi.' },
          { status: 400 }
        )
      }
    }

    // Check if email already registered
    const { data: existing } = await supabase
      .from('album_join_requests')
      .select('id, status')
      .eq('album_id', albumId)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar dan menunggu persetujuan' },
          { status: 400 }
        )
      } else if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'Email ini sudah terdaftar dan disetujui' },
          { status: 400 }
        )
      }
      // If rejected, allow re-register
    }

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Insert request
    const { data: request_data, error: insertError } = await supabase
      .from('album_join_requests')
      .insert({
        album_id: albumId,
        user_id: user?.id || null,
        student_name,
        class_name: class_name || null,
        email,
        phone: phone || null,
        status: 'pending'
      })
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Gagal mendaftar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
      data: request_data?.[0]
    })
  } catch (error: any) {
    console.error('Error submitting join request:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
