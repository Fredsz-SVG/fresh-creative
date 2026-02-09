import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/albums/[id]/teachers - Fetch all teachers for an album
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: albumId } = await params

    // Fetch teachers sorted by sort_order
    const { data: teachers, error } = await supabase
      .from('album_teachers')
      .select('*')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching teachers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch photos for each teacher
    if (teachers && teachers.length > 0) {
      const teacherIds = teachers.map(t => t.id)
      const { data: photos } = await supabase
        .from('album_teacher_photos')
        .select('*')
        .in('teacher_id', teacherIds)
        .order('sort_order', { ascending: true })

      // Group photos by teacher_id
      const photosByTeacher: Record<string, any[]> = {}
      if (photos) {
        photos.forEach(photo => {
          if (!photosByTeacher[photo.teacher_id]) {
            photosByTeacher[photo.teacher_id] = []
          }
          photosByTeacher[photo.teacher_id].push(photo)
        })
      }

      // Add photos array to each teacher
      teachers.forEach(teacher => {
        teacher.photos = photosByTeacher[teacher.id] || []
      })
    }

    return NextResponse.json(teachers || [])
  } catch (error: any) {
    console.error('Error in GET /api/albums/[id]/teachers:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/albums/[id]/teachers - Add a new teacher
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: albumId } = await params
    const body = await request.json()
    const { name, title } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama guru harus diisi' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      // Verify user is album owner or album admin
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('user_id')
        .eq('id', albumId)
        .maybeSingle()

      if (albumError || !album) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      }

      const isOwner = album.user_id === user.id

      if (!isOwner) {
        // Check if user is album admin
        const { data: member } = await supabase
          .from('album_members')
          .select('role')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!member || !['admin', 'owner'].includes(member.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Get max sort_order
    const { data: lastTeacher } = await supabase
      .from('album_teachers')
      .select('sort_order')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (lastTeacher?.sort_order ?? -1) + 1

    // Insert new teacher
    const { data: newTeachers, error: insertError } = await supabase
      .from('album_teachers')
      .insert({
        album_id: albumId,
        name: name.trim(),
        title: title?.trim() || null,
        sort_order: nextSortOrder,
        created_by: user.id
      })
      .select()

    if (insertError) {
      console.error('Error inserting teacher:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (!newTeachers || newTeachers.length === 0) {
      return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 })
    }

    return NextResponse.json(newTeachers[0], { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/albums/[id]/teachers:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
