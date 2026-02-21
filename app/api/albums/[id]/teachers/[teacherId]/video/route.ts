import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/albums/[id]/teachers/[teacherId]/video - Upload video
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

    const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video maksimal 20MB' }, { status: 413 })
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
      .select('id, video_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Delete old video if exists
    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await supabase.storage
          .from('album-photos')
          .remove([`teachers/${teacherId}/videos/${fileName}`])
      } catch (error) {
        console.error('Error deleting old video:', error)
      }
    }

    // Upload new video to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `teachers/${teacherId}/videos/${fileName}`

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

    // Update teacher with new video URL
    const { data: updatedTeachers, error: updateError } = await supabase
      .from('album_teachers')
      .update({ video_url: publicUrl })
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .select()

    if (updateError) {
      console.error('DB update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedTeachers || updatedTeachers.length === 0) {
      return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 })
    }

    return NextResponse.json({ video_url: publicUrl })
  } catch (error: any) {
    console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/video:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/albums/[id]/teachers/[teacherId]/video - Delete video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teacherId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: albumId, teacherId } = await params

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

    // Get teacher info
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('video_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Delete video from storage
    if (teacher.video_url) {
      try {
        const urlParts = teacher.video_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await supabase.storage
          .from('album-photos')
          .remove([`teachers/${teacherId}/videos/${fileName}`])
      } catch (error) {
        console.error('Error deleting video from storage:', error)
      }
    }

    // Update teacher to remove video URL
    const { error: updateError } = await supabase
      .from('album_teachers')
      .update({ video_url: null })
      .eq('id', teacherId)
      .eq('album_id', albumId)

    if (updateError) {
      console.error('Error updating teacher:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE video:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
