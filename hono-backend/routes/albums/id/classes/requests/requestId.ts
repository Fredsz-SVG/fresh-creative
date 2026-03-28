import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../lib/supabase'
import { getRole } from '../../../../../lib/auth'

const classRequestIdRoute = new Hono()

classRequestIdRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  const requestId = c.req.param('requestId')
  if (!albumId || !classId || !requestId) return c.json({ error: 'IDs required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = (album as any).user_id === user.id
  const globalRole = await getRole(supabase, user)
  if (!isOwner && globalRole !== 'admin') {
    const { data: member } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    if ((member as any)?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const status = body?.status === 'approved' ? 'approved' : body?.status === 'rejected' ? 'rejected' : null
  if (!status) return c.json({ error: 'status must be approved or rejected' }, 400)

  const { data: row, error: fetchErr } = await client
    .from('album_join_requests')
    .select('id, assigned_class_id, user_id, student_name, email, album_id')
    .eq('id', requestId).eq('assigned_class_id', classId).single()

  if (fetchErr || !row) return c.json({ error: 'Request not found' }, 404)

  if (status === 'approved') {
    const r = row as any
    const { data: created, error: insertErr } = await client
      .from('album_class_access')
      .insert({ album_id: r.album_id, class_id: r.assigned_class_id, user_id: r.user_id, student_name: r.student_name, email: r.email || null, status: 'approved' })
      .select().single()
    if (insertErr) return c.json({ error: insertErr.message }, 500)

    await client.from('album_members').upsert({ album_id: r.album_id, user_id: r.user_id, role: 'member' }, { onConflict: 'album_id,user_id' })
    await client.from('album_join_requests').delete().eq('id', requestId)
    return c.json(created)
  } else {
    const { data: updated, error } = await client
      .from('album_join_requests').update({ status: 'rejected' }).eq('id', requestId).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json(updated)
  }
})

export default classRequestIdRoute
