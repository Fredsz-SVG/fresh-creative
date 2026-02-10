import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// PATCH /api/albums/[id]/join-requests/[requestId] - Approve or reject
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: albumId, requestId } = await context.params
    const body = await request.json()
    const { action, assigned_class_id, rejected_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action harus "approve" atau "reject"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request details
    const { data: joinRequest, error: fetchError } = await supabase
      .from('album_join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { error: 'Request tidak ditemukan' },
        { status: 404 }
      )
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request sudah diproses sebelumnya' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      if (!assigned_class_id) {
        return NextResponse.json(
          { error: 'Class ID wajib diisi saat approve' },
          { status: 400 }
        )
      }

      // Verify class exists and belongs to album
      const { data: classData, error: classError } = await supabase
        .from('album_classes')
        .select('id')
        .eq('id', assigned_class_id)
        .eq('album_id', albumId)
        .maybeSingle()

      if (classError || !classData) {
        return NextResponse.json(
          { error: 'Class tidak valid' },
          { status: 400 }
        )
      }

      // Create album_class_access entry if user_id exists
      if (joinRequest.user_id) {
        const adminClient = createAdminClient()
        const client = adminClient || supabase

        // Check if user already has access to this class
        const { data: existingAccess } = await client
          .from('album_class_access')
          .select('id')
          .eq('album_id', albumId)
          .eq('class_id', assigned_class_id)
          .eq('user_id', joinRequest.user_id)
          .maybeSingle()

        if (existingAccess) {
          return NextResponse.json(
            { error: 'User sudah memiliki akses ke kelas ini' },
            { status: 400 }
          )
        }

        const { error: accessError } = await client
          .from('album_class_access')
          .insert({
            album_id: albumId,
            class_id: assigned_class_id,
            user_id: joinRequest.user_id,
            student_name: joinRequest.student_name,
            email: joinRequest.email,
            status: 'approved'
          })

        if (accessError) {
          console.error('Error creating access:', accessError)
          return NextResponse.json(
            { error: 'Gagal menambahkan akses ke kelas' },
            { status: 500 }
          )
        }

        // Update join_requests status to approved (keep for history)
        const { error: updateError } = await client
          .from('album_join_requests')
          .update({
            status: 'approved',
            assigned_class_id: assigned_class_id,
            approved_at: new Date().toISOString(),
            approved_by: user.id
          })
          .eq('id', requestId)

        if (updateError) {
          console.error('Error updating join request:', updateError)
          // Don't fail the whole operation, access already granted
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Request disetujui dan user ditambahkan ke kelas'
        })
      } else {
        return NextResponse.json(
          { error: 'User ID tidak ditemukan pada request' },
          { status: 400 }
        )
      }
    } else {
      // Reject
      const { data: updated, error: updateError } = await supabase
        .from('album_join_requests')
        .update({
          status: 'rejected',
          rejected_reason: rejected_reason || null,
          approved_by: user.id
        })
        .eq('id', requestId)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { error: 'Gagal menolak request' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Request ditolak',
        data: updated?.[0]
      })
    }
  } catch (error: any) {
    console.error('Error processing join request:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// DELETE /api/albums/[id]/join-requests/[requestId] - Delete request
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: albumId, requestId } = await context.params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('album_join_requests')
      .delete()
      .eq('id', requestId)
      .eq('album_id', albumId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting join request:', error)
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    )
  }
}
