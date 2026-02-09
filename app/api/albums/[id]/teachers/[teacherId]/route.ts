import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// PATCH /api/albums/[id]/teachers/[teacherId] - Update teacher info
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; teacherId: string } }
) {
  try {
    const supabase = createClient()
    const albumId = params.id
    const teacherId = params.teacherId
    const body = await request.json()
    const { name, title, message } = body

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

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (title !== undefined) updateData.title = title?.trim() || null
    if (message !== undefined) updateData.message = message?.trim() || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update teacher
    const { data: updatedTeacher, error: updateError } = await supabase
      .from('album_teachers')
      .update(updateData)
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating teacher:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    return NextResponse.json(updatedTeacher)
  } catch (error: any) {
    console.error('Error in PATCH /api/albums/[id]/teachers/[teacherId]:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/albums/[id]/teachers/[teacherId] - Delete teacher
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

    // Get teacher info to delete photo from storage if exists
    const { data: teacher } = await supabase
      .from('album_teachers')
      .select('photo_url')
      .eq('id', teacherId)
      .eq('album_id', albumId)
      .single()

    // Delete photo from storage if exists
    if (teacher?.photo_url) {
      try {
        const urlParts = teacher.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const bucket = 'yearbook-photos' // atau bucket yang sesuai
        
        await supabase.storage
          .from(bucket)
          .remove([`teachers/${teacherId}/${fileName}`])
      } catch (error) {
        console.error('Error deleting photo from storage:', error)
        // Continue with teacher deletion even if photo deletion fails
      }
    }

    // Delete teacher
    const { error: deleteError } = await supabase
      .from('album_teachers')
      .delete()
      .eq('id', teacherId)
      .eq('album_id', albumId)

    if (deleteError) {
      console.error('Error deleting teacher:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error in DELETE /api/albums/[id]/teachers/[teacherId]:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
