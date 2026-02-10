import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/albums/[id]/check-user - Check if current user has a request for this album
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ hasRequest: false })
    }

    // Use admin client to check if user has a request
    const adminClient = createAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Check album_join_requests for pending/rejected requests
    const { data: existing } = await adminClient
      .from('album_join_requests')
      .select('id, status')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()

    // If approved, verify they still have active access in album_class_access or album_members
    if (existing && existing.status === 'approved') {
      // Check if user still has active access
      const { data: classAccess } = await adminClient
        .from('album_class_access')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()

      const { data: memberAccess } = await adminClient
        .from('album_members')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()

      // If they have active access, return approved status
      if (classAccess || memberAccess) {
        return NextResponse.json({
          hasRequest: true,
          status: 'approved'
        })
      }

      // Approved but no longer has access - allow re-registration
      return NextResponse.json({ hasRequest: false })
    }

    // Return pending/rejected status as-is
    if (existing) {
      return NextResponse.json({
        hasRequest: true,
        status: existing.status
      })
    }

    return NextResponse.json({ hasRequest: false })
  } catch (error) {
    console.error('Error checking user request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
