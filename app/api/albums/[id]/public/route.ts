import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/albums/[id]/public - Get album basic info (no auth required for registration page)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: albumId } = await context.params
    console.log('[PUBLIC] Fetching album info for:', albumId)
    
    // Use admin client to get public album info without auth
    const supabase = createAdminClient()
    if (!supabase) {
      console.error('[PUBLIC] Failed to create admin client')
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    console.log('[PUBLIC] Admin client created, querying database...')
    const { data: album, error } = await supabase
      .from('albums')
      .select('id, name, description, students_count')
      .eq('id', albumId)
      .maybeSingle()

    if (error) {
      console.error('[PUBLIC] Database error:', error)
      return NextResponse.json({ error: 'Album tidak ditemukan' }, { status: 404 })
    }

    if (!album) {
      console.log('[PUBLIC] No album found with ID:', albumId)
      return NextResponse.json({ error: 'Album tidak ditemukan' }, { status: 404 })
    }

    // Fetch album classes so registration form can show them
    const { data: classes } = await supabase
      .from('album_classes')
      .select('id, name, sort_order')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })

    console.log('[PUBLIC] Album found:', album.name, '- classes:', classes?.length ?? 0)
    return NextResponse.json({ ...album, classes: classes || [] })
  } catch (error) {
    console.error('[PUBLIC] Error fetching public album info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch album' },
      { status: 500 }
    )
  }
}
