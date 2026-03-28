import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const albumJoinRequestsRoute = new Hono()

albumJoinRequestsRoute.get('/', async (c) => {
  const albumId = c.req.param('id')
  try {
    const supabase = getSupabaseClient(c)
    const status = c.req.query('status')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    if (status === 'approved') {
      let adminClient
      try {
        adminClient = getAdminSupabaseClient(c?.env as any)
      } catch (e: any) {
        // fallback
      }
      const client = adminClient || supabase
      const { data: approvedData, error: approvedError } = await client
        .from('album_class_access')
        .select('id, user_id, student_name, email, class_id, status, created_at')
        .eq('album_id', albumId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      if (approvedError) return c.json([])
      const transformed = approvedData?.map((access: any) => ({
        id: access.id,
        album_id: albumId,
        user_id: access.user_id,
        student_name: access.student_name,
        email: access.email,
        phone: null,
        class_name: null,
        assigned_class_id: access.class_id,
        status: 'approved',
        requested_at: access.created_at,
        approved_at: access.created_at,
        approved_by: null
      })) || []
      return c.json(transformed)
    }
    // For pending/rejected/all, query album_join_requests
    let query = supabase
      .from('album_join_requests')
      .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
      .eq('album_id', albumId)
      .order('requested_at', { ascending: false })
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    const { data, error } = await query
    if (error) throw error
    return c.json(data || [])
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch join requests' })
  }
})

albumJoinRequestsRoute.post('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const body = await c.req.json()
    const { student_name, class_name, email, phone } = body
    if (!student_name || !email) {
      return c.json({ error: 'Nama dan email wajib diisi' }, 400)
    }
    const supabase = getSupabaseClient(c)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return c.json({ error: 'Unauthorized - silakan login terlebih dahulu' }, 401)
    }
    const adminClient = getAdminSupabaseClient(c?.env as any)
    if (!adminClient) {
      return c.json({ error: 'Database connection failed' }, 500)
    }
    const { data: album, error: albumError } = await adminClient
      .from('albums')
      .select('id, students_count, name')
      .eq('id', albumId)
      .maybeSingle()
    if (albumError || !album) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }
    const { data: stats } = await adminClient.rpc('get_album_join_stats', { _album_id: albumId })
    if (stats && stats.length > 0) {
      const { available_slots } = stats[0]
      if (available_slots <= 0) {
        return c.json({ error: 'Maaf, album sudah penuh. Tidak bisa menerima pendaftaran lagi.' }, 400)
      }
    }
    const { data: existing } = await adminClient
      .from('album_join_requests')
      .select('id, status, email')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) {
      if (existing.status === 'pending') {
        return c.json({ error: 'Anda sudah mendaftar dan menunggu persetujuan' }, 400)
      } else if (existing.status === 'approved') {
        return c.json({ error: 'Anda sudah terdaftar dan disetujui' }, 400)
      } else if (existing.status === 'rejected') {
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
          return c.json({ error: updateError.message || 'Gagal mendaftar ulang' }, 500)
        }
        await adminClient.from('notifications').insert({
          user_id: user.id,
          title: 'Status Pendaftaran Album',
          message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
          type: 'info',
          metadata: { status: 'Menunggu Persetujuan' }
        })
        return c.json({
          success: true,
          message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
          data: updated_data?.[0]
        }, 201)
      }
    }
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
      return c.json({ error: insertError.message || 'Gagal mendaftar' })
    }
    await adminClient.from('notifications').insert({
      user_id: user.id,
      title: 'Status Pendaftaran Album',
      message: `${album.name}\n${student_name}${class_name ? ` - ${class_name}` : ''}\n${email}`,
      type: 'info',
      metadata: { status: 'Menunggu Persetujuan' }
    })
    return c.json({
      success: true,
      message: 'Pendaftaran berhasil! Tunggu persetujuan dari admin.',
      data: request_data?.[0]
    }, 201)
  } catch (error: any) {
    return c.json({ error: error.message || 'Terjadi kesalahan' })
  }
})

export default albumJoinRequestsRoute
