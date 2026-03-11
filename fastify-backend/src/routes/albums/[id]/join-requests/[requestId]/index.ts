import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.patch('/', async (request: any, reply: any) => {

    try {
      const { id: albumId, requestId } = request.params as any
      const body = request.body
      const { action, assigned_class_id, rejected_reason } = body

      if (!action || !['approve', 'reject'].includes(action)) {
        return reply.code(400).send({ error: 'Action harus "approve" atau "reject"' })
      }

      const supabase = getSupabaseClient(request)
      const admin = getAdminSupabaseClient()
      if (!admin) return reply.code(500).send({ error: 'Server error' })

      // Check permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      // Verify user is album owner or album admin
      const { data: album } = await admin.from('albums').select('user_id').eq('id', albumId).maybeSingle()
      if (!album) return reply.code(404).send({ error: 'Album tidak ditemukan' })
      const isOwner = (album as { user_id: string }).user_id === user.id
      if (!isOwner) {
        const { data: member } = await admin.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
        if (!member || !['admin', 'owner'].includes((member as { role: string }).role)) {
          return reply.code(403).send({ error: 'Forbidden' })
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
        return reply.code(404).send({ error: 'Request tidak ditemukan' })
      }

      if (joinRequest.status !== 'pending') {
        return reply.code(400).send({ error: 'Request sudah diproses sebelumnya' })
      }

      if (action === 'approve') {
        if (!assigned_class_id) {
          return reply.code(400).send({ error: 'Class ID wajib diisi saat approve' })
        }

        // Verify class exists and belongs to album
        const { data: classData, error: classError } = await supabase
          .from('album_classes')
          .select('id')
          .eq('id', assigned_class_id)
          .eq('album_id', albumId)
          .maybeSingle()

        if (classError || !classData) {
          return reply.code(400).send({ error: 'Class tidak valid' })
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
            return reply.code(400).send({ error: 'User sudah memiliki akses ke kelas ini' })
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
            return reply.code(500).send({ error: 'Gagal menambahkan akses ke kelas' })
          }

          // IMPORTANT: Also add to album_members as 'member' role (for team management)
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

          return reply.code(200).send({
            success: true,
            message: 'Request disetujui dan user ditambahkan ke kelas'
          })
        } else {
          return reply.code(400).send({ error: 'User ID tidak ditemukan pada request' })
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
          return reply.code(500).send({ error: 'Gagal menolak request' })
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

        return reply.code(200).send({
          success: true,
          message: 'Request ditolak',
          data: updated?.[0]
        })
      }
    } catch (error: any) {
      console.error('Error processing join request:', error)
      return reply.code(500).send({ error: error.message || 'Terjadi kesalahan' })
    }

  })

  server.delete('/', async (request: any, reply: any) => {

    try {
      const { id: albumId, requestId } = request.params as any
      const supabase = getSupabaseClient(request)

      const { error } = await supabase
        .from('album_join_requests')
        .delete()
        .eq('id', requestId)
        .eq('album_id', albumId)

      if (error) throw error

      return reply.code(500).send({ success: true })
    } catch (error) {
      console.error('Error deleting join request:', error)
      return reply.send({ error: 'Failed to delete request' })
    }

  })

}

export default route
