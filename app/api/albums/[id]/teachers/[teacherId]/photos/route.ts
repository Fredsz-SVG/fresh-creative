import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/albums/[id]/teachers/[teacherId]/photos - Upload multiple photos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teacherId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: albumId, teacherId } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      const { data: album } = await supabase
        .from('albums')
        .select('user_id')
        .eq('id', albumId)
        .maybeSingle()

      if (!album) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      }

      const isOwner = album.user_id === user.id

      if (!isOwner) {
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

    // Verify teacher exists
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('id')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Maksimal 4 foto per profil
    const { count } = await supabase
      .from('album_teacher_photos')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)

    if ((count ?? 0) >= 4) {
      return NextResponse.json({ error: 'Maksimal 4 foto per profil' }, { status: 400 })
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('album-photos')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('album-photos')
      .getPublicUrl(filePath)

    // Get max sort order
    const { data: maxSort } = await supabase
      .from('album_teacher_photos')
      .select('sort_order')
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = (maxSort?.sort_order ?? -1) + 1

    // Insert photo record
    const { data: newPhotos, error: insertError } = await supabase
      .from('album_teacher_photos')
      .insert({
        teacher_id: teacherId,
        file_url: publicUrl,
        sort_order: nextSort
      })
      .select()

    if (insertError) {
      console.error('DB insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (!newPhotos || newPhotos.length === 0) {
      return NextResponse.json({ error: 'Failed to create photo record' }, { status: 500 })
    }

    return NextResponse.json(newPhotos[0], { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/photos:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/albums/[id]/teachers/[teacherId]/photos/[photoId] handled by separate route
