import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// DELETE /api/albums/[id]/teachers/[teacherId]/photos/[photoId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teacherId: string; photoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: albumId, teacherId, photoId } = await params

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

    // Get photo info
    const { data: photo } = await supabase
      .from('album_teacher_photos')
      .select('file_url')
      .eq('id', photoId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from storage
    try {
      const urlParts = photo.file_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `teachers/${teacherId}/${fileName}`

      await supabase.storage
        .from('album-photos')
        .remove([filePath])
    } catch (error) {
      console.error('Error deleting from storage:', error)
      // Continue with DB deletion even if storage fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('album_teacher_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting photo record:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE photo:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
