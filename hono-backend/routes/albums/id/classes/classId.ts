import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const classIdRoute = new Hono()

classIdRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can delete class' }, 403)
  }

  const { data: cls } = await client
    .from('album_classes')
    .select('id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const { error: delErr } = await client.from('album_classes').delete().eq('id', classId)
  if (delErr) return c.json({ error: delErr.message }, 500)
  return c.json({ message: 'Class deleted' })
})

classIdRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can update class' }, 403)
  }

  const { data: cls } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .maybeSingle()

  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const sort_order = body?.sort_order !== undefined ? Number(body.sort_order) : undefined
  const batch_photo_url = typeof body?.batch_photo_url === 'string' ? body.batch_photo_url : undefined

  const updates: { name?: string; sort_order?: number; batch_photo_url?: string } = {}
  if (name !== undefined) {
    if (!name) return c.json({ error: 'Class name is required' }, 400)
    // ensure unique name within album
    const { data: existing } = await client
      .from('album_classes')
      .select('id')
      .eq('album_id', albumId)
      .eq('name', name)
      .maybeSingle()
    if (existing && existing.id !== classId) return c.json({ error: 'Class with this name already exists' }, 400)
    updates.name = name
  }
  if (sort_order !== undefined && !Number.isNaN(sort_order)) updates.sort_order = sort_order
  if (batch_photo_url !== undefined) updates.batch_photo_url = batch_photo_url

  if (Object.keys(updates).length === 0) {
    const { data: current } = await client.from('album_classes').select('id, name, sort_order, batch_photo_url').eq('id', classId).maybeSingle()
    return c.json(current ?? {}, 500)
  }

  const { data: updated, error } = await client
    .from('album_classes')
    .update(updates)
    .eq('id', classId)
    .select('id, name, sort_order, batch_photo_url')
    .single()

  if (error) return c.json({ error: error.message })
  return c.json(updated)
})

export default classIdRoute
