import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

async function getRole(supabase: any, user: any): Promise<'admin' | 'user'> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!error && data?.role === 'admin') return 'admin'
    if (!error && data?.role === 'user') return 'user'
    const metaRole = (user.user_metadata?.role as string) || (user.app_metadata?.role as string)
    if (metaRole === 'admin' || metaRole === 'user') return metaRole
  } catch {}
  return 'user'
}

const albumClasses = new Hono()

albumClasses.get('/:id/classes', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase
  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const { data: classes, error } = await client
    .from('album_classes')
    .select('id, name, sort_order, batch_photo_url')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
  if (error) return c.json({ error: error.message }, 500)
  const classList = (classes ?? [])
  const { data: allAccess } = await client
    .from('album_class_access')
    .select('class_id, photos')
    .eq('album_id', albumId)
  const studentCounts: Record<string, number> = {}
  if (allAccess) {
    for (const r of allAccess) {
      if (Array.isArray(r.photos) && r.photos.length > 0) {
        studentCounts[r.class_id] = (studentCounts[r.class_id] ?? 0) + 1
      }
    }
  }
  const withCount = classList.map((c: any) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    batch_photo_url: c.batch_photo_url,
    student_count: studentCounts[c.id] ?? 0,
  }))
  return c.json(withCount)
})

albumClasses.post('/:id/classes', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase
  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if (album.user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Only owner can add class' }, 403)
  }
  const body = await c.req.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return c.json({ error: 'Class name is required' }, 400)
  const { data: existing } = await client
    .from('album_classes')
    .select('id')
    .eq('album_id', albumId)
    .eq('name', name)
    .maybeSingle()
  if (existing) return c.json({ error: 'Class with this name already exists' }, 400)
  const { count } = await client.from('album_classes').select('id', { count: 'exact', head: true }).eq('album_id', albumId)
  const sort_order = (count ?? 0)
  const { data: created, error } = await client
    .from('album_classes')
    .insert({ album_id: albumId, name, sort_order })
    .select('id, name, sort_order, album_id, created_at')
    .single()
  if (error) {
    const isDuplicate = /duplicate key|unique constraint|album_classes_album_id_name_key/i.test(error.message)
    if (isDuplicate) {
      return c.json({ error: 'Kelas dengan nama ini sudah ada di album ini' }, 400)
    }
    return c.json({ error: error.message }, 500)
  }
  return c.json(created)
})

export default albumClasses
