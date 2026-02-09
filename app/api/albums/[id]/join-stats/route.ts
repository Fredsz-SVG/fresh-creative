import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/albums/[id]/join-stats - Get join statistics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params
    const supabase = await createClient()
    
    // Call the stats function
    const { data, error } = await supabase.rpc('get_album_join_stats', {
      _album_id: albumId
    })

    if (error) throw error

    const stats = data?.[0] || {
      limit_count: null,
      approved_count: 0,
      pending_count: 0,
      rejected_count: 0,
      available_slots: 999999
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching join stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
