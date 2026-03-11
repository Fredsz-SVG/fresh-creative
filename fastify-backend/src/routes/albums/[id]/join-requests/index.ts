import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const { id: albumId } = request.params as any
    try {
      const supabase = getSupabaseClient(request)
  
      const url = { searchParams: request.query as any }
      const status = (request.query as any)?.status // 'pending', 'approved', 'rejected', or 'all'
  
      // Check permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
  
      // Special handling for approved status
      // Approved requests are moved to album_class_access and deleted from album_join_requests
      if (status === 'approved') {
        const adminClient = getAdminSupabaseClient()
        const client = adminClient || supabase
  
        const { data: approvedData, error: approvedError } = await client
          .from('album_class_access')
          .select('id, album_id, user_id, student_name, email, class_id, status, created_at, album_classes!inner(name)')
          .eq('album_id', albumId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
  
        if (approvedError) throw approvedError
  
        // Transform data to match join_requests format
        const transformed = approvedData?.map((access: any) => ({
          id: access.id,
          album_id: access.album_id,
          user_id: access.user_id,
          student_name: access.student_name,
          email: access.email,
          phone: null, // Not stored in album_class_access
          class_name: access.album_classes?.name || 'Unknown',
          assigned_class_id: access.class_id,
          status: 'approved',
          requested_at: access.created_at,
          approved_at: access.created_at,
          approved_by: null
        })) || []
  
        return reply.send(transformed)
      }
  
      // For pending/rejected/all, query album_join_requests
      let query = supabase
        .from('album_join_requests')
        .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
        .eq('album_id', albumId)
        .order('requested_at', { ascending: false })
  
      // Filter by status if specified
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }
  
      const { data, error } = await query
  
      if (error) throw error
  
      return reply.send(data || [])
    } catch (error) {
      console.error('Error fetching join requests:', error)
      return reply.send({ error: 'Failed to fetch join requests' })
    } finally {
      }
  
  })

  server.post('/', async (request: any, reply: any) => {
  
    try {
      const { id: albumId } = request.params as any
  
      const body = request.body
      const { student_name, class_name, email, phone } = body
  
      if (!student_name || !email) {
        return reply.code(400).send({ error: 'Nama dan email wajib diisi' })
      }
  
      const supabase = getSupabaseClient(request)
  
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized - silakan login terlebih dahulu' })
      }
  
  
      // Use admin client to check album (bypass RLS)
      const adminClient = getAdminSupabaseClient()
      if (!adminClient) {
        return reply.code(500).send({ error: 'Database connection failed' })
      }
  
      // Check if album exists and get capacity
      const { data: album, error: albumError } = await adminClient
        .from('albums')
        .select('id, students_count, name')
        .eq('id', albumId)
        .maybeSingle()
  
      if (albumError || !album) {
        console.error('[JOIN-REQUEST] Album not found:', albumError)
        return reply.code(404).send({ error: 'Album tidak ditemukan' })
      }
  
  
      // Check capacity using admin client
      const { data: stats, error: statsError } = await adminClient.rpc('get_album_join_stats', {
        _album_id: albumId
      })
  
      if (statsError) {
        console.error('[JOIN-REQUEST] Stats error:', statsError)
      }
  
      if (stats && stats.length > 0) {
        const { available_slots } = stats[0]
        if (available_slots <= 0) {
          return reply.code(400).send({ error: 'Maaf, album sudah penuh. Tidak bisa menerima pendaftaran lagi.' })
        }
      }
  
      // Check if user already has a request for this album (use admin client for read)
      const { data: existing } = await adminClient
        .from('album_join_requests')
        .select('id, status, email')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()
  
      if (existing) {
        if (existing.status === 'pending') {
          return reply.code(400).send({ error: 'Anda sudah mendaftar dan menunggu persetujuan' })
        } else if (existing.status === 'approved') {
          return reply.code(400).send({ error: 'Anda sudah terdaftar dan disetujui' })
        } else if (existing.status === 'rejected') {
          // If rejected, update the existing record to pending (re-register)
          const { data: updated_data, error: updateError } = await adminClient
            .from('album_join_requests')
            .update({
              student_name,
              class_name: class_name || null,
              email,
              phone: phone || null,
              status: 'pending',
              requested_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
  
          if (updateError) {
            console.error('[JOIN-REQUEST] Update error:', updateError)
            return reply.code(500).send({ error: updateError.message || 'Gagal mendaftar ulang' })
          }
  
          // Notification
          await adminClient.from('notifications').insert({
            user_id: user.id,
            title: 'Status Pendaftaran Album',
            message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
            type: 'info',
            metadata: { status: 'Menunggu Persetujuan' }
          })
  
          return reply.code(201).send({
            success: true,
            message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
            data: updated_data?.[0]
          })
        }
      }
  
      // Insert new request with authenticated user ID
      const { data: request_data, error: insertError } = await supabase
        .from('album_join_requests')
        .insert({
          album_id: albumId,
          user_id: user.id,
          student_name,
          class_name: class_name || null,
          email,
          phone: phone || null,
          status: 'pending'
        })
        .select()
  
      if (insertError) {
        console.error('[JOIN-REQUEST] Insert error:', insertError)
        return reply.send({ error: insertError.message || 'Gagal mendaftar' })
      }
  
      // Notification
      await adminClient.from('notifications').insert({
        user_id: user.id,
        title: 'Status Pendaftaran Album',
        message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
        type: 'info',
        metadata: { status: 'Menunggu Persetujuan' }
      })
  
      return reply.code(201).send({
        success: true,
        message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
        data: request_data?.[0]
      })
    } catch (error: any) {
      console.error('[JOIN-REQUEST] Error submitting join request:', error)
      return reply.send({ error: error.message || 'Terjadi kesalahan' })
    }
  
  })

}

export default route
