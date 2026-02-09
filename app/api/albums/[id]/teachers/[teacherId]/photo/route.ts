import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/albums/[id]/teachers/[teacherId]/photo - Upload teacher photo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; teacherId: string } }
) {
  try {
    const supabase = createClient()
    const albumId = params.id
    const teacherId = params.teacherId

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
      .single()

    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      // Verify user is album owner or album admin
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('created_by')
        .eq('id', albumId)
        .single()

      if (albumError || !album) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      }

      const isOwner = album.created_by === user.id

      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members')
          .select('role')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .single()

        if (!member || !['admin', 'owner'].includes(member.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Verify teacher exists
    const { data: teacher, error: teacherError } = await supabase
      .from('album_teachers')
      .select('photo_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Get file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Delete old photo if exists
    if (teacher.photo_url) {
      try {
        const urlParts = teacher.photo_url.split('/')
        const oldFileName = urlParts[urlParts.length - 1]
        const bucket = 'yearbook-photos'
        
        await supabase.storage
          .from(bucket)
          .remove([`teachers/${teacherId}/${oldFileName}`])
      } catch (error) {
        console.error('Error deleting old photo:', error)
        // Continue with upload even if old photo deletion fails
      }
    }

    // Upload new photo
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/${fileName}`
    const bucket = 'yearbook-photos'

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Update teacher with new photo URL
    const { data: updatedTeacher, error: updateError } = await supabase
      .from('album_teachers')
      .update({ photo_url: publicUrl })
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating teacher photo URL:', updateError)
      // Try to delete uploaded file
      await supabase.storage.from(bucket).remove([filePath])
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ photo_url: publicUrl, teacher: updatedTeacher })
  } catch (error: any) {
    console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/photo:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/albums/[id]/teachers/[teacherId]/photo - Delete teacher photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; teacherId: string } }
) {
  try {
    const supabase = createClient()
    const albumId = params.id
    const teacherId = params.teacherId

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
      .single()

    const isGlobalAdmin = userData?.role === 'admin'

    if (!isGlobalAdmin) {
      // Verify user is album owner or album admin
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('created_by')
        .eq('id', albumId)
        .single()

      if (albumError || !album) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 })
      }

      const isOwner = album.created_by === user.id

      if (!isOwner) {
        const { data: member } = await supabase
          .from('album_members')
          .select('role')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .single()

        if (!member || !['admin', 'owner'].includes(member.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('created_by')
      .eq('id', albumId)
      .single()

    if (albumError || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    const isOwner = album.created_by === user.id

    if (!isOwner) {
      const { data: member } = await supabase
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .single()

      if (!member || !['admin', 'owner'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get teacher info
    const { data: teacher, error: teacherError } = await supabase
      .from('album_teachers')
      .select('photo_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (!teacher.photo_url) {
      return NextResponse.json({ error: 'No photo to delete' }, { status: 400 })
    }

    // Delete photo from storage
    try {
      const urlParts = teacher.photo_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const bucket = 'yearbook-photos'
      
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([`teachers/${teacherId}/${fileName}`])

      if (storageError) {
        console.error('Error deleting photo from storage:', storageError)
        // Continue with database update even if storage deletion fails
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
    }

    // Update teacher to remove photo URL
    const { error: updateError } = await supabase
      .from('album_teachers')
      .update({ photo_url: null })
      .eq('id', teacherId)
      .eq('album_id', albumId)

    if (updateError) {
      console.error('Error updating teacher:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/albums/[id]/teachers/[teacherId]/photo:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
