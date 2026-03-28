import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const classRequestRoute = new Hono()

classRequestRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = (album as { user_id: string }).user_id === user.id
  if (!isOwner) {
    const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    if (!member) return c.json({ error: 'Anda harus bergabung ke album dulu via link undangan' }, 403)
  }

  const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return c.json({ error: 'Kelas tidak ditemukan' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : (user.email ?? '')

  if (!student_name) return c.json({ error: 'Nama siswa wajib' }, 400)

  // Check album_class_access untuk approved access
  const { data: existingAccess } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Check album_join_requests untuk pending request
  const { data: existingRequest } = await client
    .from('album_join_requests')
    .select('id, status')
    .eq('assigned_class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Jika sudah approved di album_class_access, return approved data
  if (existingAccess) {
    const row = existingAccess as { status: string }
    if (row.status === 'approved') {
      const { data: fullAccess } = await client.from('album_class_access').select().eq('id', (existingAccess as { id: string }).id).single()
      return c.json(fullAccess ?? existingAccess, 500)
    }
    // Jika rejected, update ke request baru
    if (row.status === 'rejected') {
      // Delete dari access dan create request baru
      await client.from('album_class_access').delete().eq('id', (existingAccess as { id: string }).id)
    }
  }

  // Jika sudah pending di album_join_requests, return pending data
  const existingReq = existingRequest as { id: string; status: string } | null
  if (existingReq?.status === 'pending') {
    const { data: fullRequest } = await client.from('album_join_requests').select().eq('id', existingReq.id).single()
    return c.json(fullRequest ?? existingRequest)
  }

  // Jika rejected, update jadi pending dengan nama/email baru (ajukan ulang)
  if (existingReq?.status === 'rejected') {
    const { data: updated, error: updateErr } = await client
      .from('album_join_requests')
      .update({ student_name, email: email || null, status: 'pending' })
      .eq('id', existingReq.id)
      .select()
      .single()
    if (updateErr) return c.json({ error: updateErr.message })
    return c.json(updated, 500)
  }

  // Create new pending request di album_join_requests
  const { data: created, error } = await client
    .from('album_join_requests')
    .insert({
      album_id: albumId,
      assigned_class_id: classId,
      user_id: user.id,
      student_name,
      email: email || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message })
  return c.json(created)
})

export default classRequestRoute
