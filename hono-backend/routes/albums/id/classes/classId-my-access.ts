import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const myAccessRoute = new Hono()

myAccessRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: access, error } = await client
    .from('album_class_access')
    .select('id, student_name, email, status, created_at, date_of_birth, instagram, message, video_url')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return c.json({ error: error.message }, 500)
  if (!access) return c.json({ access: null })
  return c.json(access)
})

myAccessRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: access, error: fetchErr } = await client
    .from('album_class_access')
    .select('id, user_id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return c.json({ error: fetchErr.message }, 500)
  if (!access) return c.json({ error: 'Akses tidak ditemukan' }, 404)
  if ((access as { status: string }).status !== 'approved') return c.json({ error: 'Hanya bisa menyunting setelah akses disetujui' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined
  const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined
  const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined
  const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined
  const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined

  if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
    return c.json({ error: 'Minimal satu field required (student_name, email, date_of_birth, instagram, message, video_url)' }, 400)
  }
  const updates: {
    student_name?: string
    email?: string | null
    date_of_birth?: string | null
    instagram?: string | null
    message?: string | null
    video_url?: string | null
    updated_at: string
  } = { updated_at: new Date().toISOString() }
  if (student_name !== undefined) updates.student_name = student_name
  if (email !== undefined) updates.email = email
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth
  if (instagram !== undefined) updates.instagram = instagram
  if (message !== undefined) updates.message = message
  if (video_url !== undefined) updates.video_url = video_url

  const { data: updated, error } = await client
    .from('album_class_access')
    .update(updates)
    .eq('id', (access as { id: string }).id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)

  // Invalidate cache
  return c.json(updated)
})

myAccessRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: access, error: fetchErr } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return c.json({ error: fetchErr.message }, 500)
  if (!access) return c.json({ error: 'Akses tidak ditemukan' }, 404)

  const { error: deleteErr } = await client
    .from('album_class_access')
    .delete()
    .eq('id', (access as { id: string }).id)
  if (deleteErr) return c.json({ error: deleteErr.message }, 500)

  // Also delete from album_join_requests so user can re-register
  await client
    .from('album_join_requests')
    .delete()
    .eq('album_id', albumId)
    .eq('user_id', user.id)

  // Invalidate cache
  return c.json({ success: true })
})

export default myAccessRoute
