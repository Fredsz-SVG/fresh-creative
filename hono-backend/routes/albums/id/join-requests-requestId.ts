import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const joinRequestsRequestId = new Hono()

joinRequestsRequestId.patch('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const requestId = c.req.param('requestId')
    const body = await c.req.json()
    const { action, assigned_class_id, rejected_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return c.json({ error: 'Action harus "approve" atau "reject"' }, 400)
    }

    const supabase = getSupabaseClient(c)
    const admin = getAdminSupabaseClient(c?.env as any)
    if (!admin) return c.json({ error: 'Server error' }, 500)

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Verify user is album owner or album admin
    const { data: album } = await admin.from('albums').select('user_id').eq('id', albumId).maybeSingle()
    if (!album) return c.json({ error: 'Album tidak ditemukan' }, 404)
    const isOwner = (album as { user_id: string }).user_id === user.id
    if (!isOwner) {
      const { data: member } = await admin.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
      if (!member || !['admin', 'owner'].includes((member as { role: string }).role)) {
        return c.json({ error: 'Forbidden' }, 403)
      }
    }

    // Get request details (use admin so RLS does not hide the row)
    const { data: joinRequest, error: fetchError } = await admin
      .from('album_join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('album_id', albumId)
      .maybeSingle()

    if (fetchError || !joinRequest) {
      return c.json({ error: 'Request tidak ditemukan' }, 404)
    }

    if (joinRequest.status !== 'pending') {
      return c.json({ error: 'Request sudah diproses sebelumnya' }, 400)
    }

    if (action === 'approve') {
      if (!assigned_class_id) {
        return c.json({ error: 'Class ID wajib diisi saat approve' }, 400)
      }

      // Verify class exists and belongs to album
      const { data: classData, error: classError } = await supabase
        .from('album_classes')
        .select('id')
        .eq('id', assigned_class_id)
        .eq('album_id', albumId)
        .maybeSingle()

      if (classError || !classData) {
        return c.json({ error: 'Class tidak valid' }, 400)
      }

      // Create album_class_access entry if user_id exists
      if (joinRequest.user_id) {
        // Check if user already has access to this class
        const { data: existingAccess } = await admin
          .from('album_class_access')
          .select('id')
          .eq('album_id', albumId)
          .eq('class_id', assigned_class_id)
          .eq('user_id', joinRequest.user_id)
          .maybeSingle()

        if (existingAccess) {
          return c.json({ error: 'User sudah memiliki akses ke kelas ini' }, 400)
        }

        const { error: accessError } = await admin
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
          return c.json({ error: 'Gagal menambahkan akses ke kelas' }, 500)
        }

        // Also add to album_members as 'member' role
        const { error: memberErr } = await admin
          .from('album_members')
          .upsert(
            { album_id: albumId, user_id: joinRequest.user_id, role: 'member' },
            { onConflict: 'album_id,user_id' }
          )
        if (memberErr) {
          console.error('Failed to add to album_members:', memberErr)
        }

        // Delete from join_requests after successful approval
        const { error: deleteError } = await admin
          .from('album_join_requests')
          .delete()
          .eq('id', requestId)

        if (deleteError) {
          console.error('Error deleting join request:', deleteError)
        }

        // Fetch album name for notification
        const { data: albumData } = await admin
          .from('albums')
          .select('name')
          .eq('id', albumId)
          .single()

        // Create notification
        await admin.from('notifications').insert({
          user_id: joinRequest.user_id,
          title: 'Status Pendaftaran Album',
          message: `${albumData?.name || 'Album'}\n${joinRequest.student_name}${joinRequest.class_name ? ` - ${joinRequest.class_name}` : ''}\n${joinRequest.email}`,
          type: 'success',
          metadata: { status: 'Disetujui' }
        })

        return c.json({
          success: true,
          message: 'Request disetujui dan user ditambahkan ke kelas'
        })
      } else {
        return c.json({ error: 'User ID tidak ditemukan pada request' }, 400)
      }
    } else {
      // Reject
      const { data: updated, error: updateError } = await admin
        .from('album_join_requests')
        .update({
          status: 'rejected',
          rejected_reason: rejected_reason || null,
          approved_by: user.id
        })
        .eq('id', requestId)
        .eq('album_id', albumId)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        return c.json({ error: 'Gagal menolak request' }, 500)
      }

      // Notify user only if they have an account (user_id)
      if (joinRequest.user_id) {
        const { data: albumData } = await admin
          .from('albums')
          .select('name')
          .eq('id', albumId)
          .single()
        await admin.from('notifications').insert({
          user_id: joinRequest.user_id,
          title: 'Status Pendaftaran Album',
          message: `${albumData?.name || 'Album'}\n${joinRequest.student_name}${joinRequest.class_name ? ` - ${joinRequest.class_name}` : ''}\n${joinRequest.email}`,
          type: 'error',
          metadata: { status: 'Ditolak', reason: rejected_reason }
        })
      }

      return c.json({
        success: true,
        message: 'Request ditolak',
        data: updated?.[0]
      })
    }
  } catch (error: any) {
    console.error('Error processing join request:', error)
    return c.json({ error: error.message || 'Terjadi kesalahan' }, 500)
  }
})

joinRequestsRequestId.delete('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const requestId = c.req.param('requestId')
    const supabase = getSupabaseClient(c)

    const { error } = await supabase
      .from('album_join_requests')
      .delete()
      .eq('id', requestId)
      .eq('album_id', albumId)

    if (error) throw error

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting join request:', error)
    return c.json({ error: 'Failed to delete request' })
  }
})

export default joinRequestsRequestId
