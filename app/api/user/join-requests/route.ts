import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/user/join-requests - Get current user's join requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for reading albums table
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Fetch pending/rejected requests from join_requests table
    const { data: pendingRequests, error: pendingError } = await adminClient
      .from('album_join_requests')
      .select('id, album_id, student_name, class_name, email, status, requested_at')
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected'])
      .order('requested_at', { ascending: false })

    if (pendingError) {
      console.error('Error fetching pending join requests:', pendingError)
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      )
    }

    // Fetch approved requests from album_class_access table (approved records moved here)
    const { data: approvedAccess, error: approvedError } = await adminClient
      .from('album_class_access')
      .select('id, album_id, class_id, student_name, email, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (approvedError) {
      console.error('Error fetching approved class access:', approvedError)
      // Don't fail, just continue without approved records
    }

    // Combine both results and normalize the date field
    const allRequests: any[] = [
      ...(pendingRequests || []),
      ...(approvedAccess || []).map(acc => ({
        ...acc,
        requested_at: acc.created_at
      }))
    ]

    // Fetch album names and class names for each request
    if (allRequests.length > 0) {
      const albumIds = [...new Set(allRequests.map(r => r.album_id))]
      const classIds = [...new Set(allRequests.map(r => r.class_id).filter(Boolean))]
      
      const { data: albums } = await adminClient
        .from('albums')
        .select('id, name')
        .in('id', albumIds)

      const { data: classes } = classIds.length > 0 
        ? await adminClient
          .from('album_classes')
          .select('id, name')
          .in('id', classIds)
        : { data: null }

      const albumMap = new Map(albums?.map((a: any) => [a.id, a.name]) || [])
      const classMap = new Map(classes?.map((c: any) => [c.id, c.name]) || [])
      
      const enrichedRequests = allRequests.map((req: any) => ({
        ...req,
        album_name: albumMap.get(req.album_id) || 'Unknown Album',
        class_name: req.class_name || (req.class_id ? classMap.get(req.class_id) : null) || null
      }))

      return NextResponse.json(enrichedRequests)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error('Error in user join-requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
