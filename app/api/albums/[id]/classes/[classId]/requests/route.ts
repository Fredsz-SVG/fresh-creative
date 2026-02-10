import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET: Daftar permintaan akses kelas (owner only). Query: ?status=pending (default) | approved | rejected | all */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const albumRow = album as { user_id: string }
  const isOwner = albumRow.user_id === user.id
  const globalRole = await getRole(supabase, user)
  if (!isOwner && globalRole !== 'admin') {
    const { data: member } = await client
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
    if (!isAlbumAdmin) {
      return NextResponse.json({ error: 'Only owner or album admin can list requests' }, { status: 403 })
    }
  }

  const { data: cls } = await client.from('album_classes').select('id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') ?? 'pending'

  // Pending requests berasal dari album_join_requests
  if (statusFilter === 'pending') {
    try {
      const { data: list, error } = await client
        .from('album_join_requests')
        .select('id, user_id, student_name, email, status, requested_at')
        .eq('assigned_class_id', classId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending requests:', error.message, error.code)
        return NextResponse.json({ 
          error: 'Failed to fetch pending requests',
          details: error.message,
          code: error.code 
        }, { status: 500 })
      }
      return NextResponse.json(list ?? [])
    } catch (err) {
      console.error('Exception fetching pending requests:', err)
      return NextResponse.json({ error: 'Server error fetching requests' }, { status: 500 })
    }
  }

  // Approved/rejected requests berasal dari album_class_access
  try {
    let query = client
      .from('album_class_access')
      .select('id, user_id, student_name, email, status, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: list, error } = await query

    if (error) {
      console.error('Error fetching access requests:', error.message, error.code)
      return NextResponse.json({ 
        error: 'Failed to fetch access requests',
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }
    return NextResponse.json(list ?? [])
  } catch (err) {
    console.error('Exception fetching access requests:', err)
    return NextResponse.json({ error: 'Server error fetching requests' }, { status: 500 })
  }
}
