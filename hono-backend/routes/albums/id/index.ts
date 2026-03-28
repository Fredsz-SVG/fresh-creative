import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

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

const albumId = new Hono()

albumId.get('/:id', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  try {
    const admin = getAdminSupabaseClient(c?.env as any)
    const client = admin ?? supabase
    const selectWithPosition = 'id, name, type, status, cover_image_url, cover_image_position, cover_video_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price, pricing_package_id'
    const selectWithoutPosition = 'id, name, type, status, cover_image_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price, pricing_package_id'
    const [albumRes, role] = await Promise.all([
      client.from('albums').select(selectWithPosition).eq('id', albumId).single(),
      getRole(supabase, user)
    ])
    let album = albumRes.data ?? null
    let albumErr = albumRes.error
    if (albumErr && album == null) {
      const fallback = await client.from('albums').select(selectWithoutPosition).eq('id', albumId).single()
      album = fallback.data ?? null
      albumErr = fallback.error
      if (album) album.cover_image_position = null
    }
    if (albumErr || !album) {
      return c.json({ error: 'Album not found' }, 404)
    }
    const row = album
    const isActualOwner = row.user_id === user.id
    const isAdmin = role === 'admin'
    const isOwner = isActualOwner || isAdmin
    let isAlbumAdmin = false
    if (!isOwner && !isAdmin) {
      const { data: member } = await (admin ?? supabase)
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (member) {
        if (member.role === 'admin') {
          isAlbumAdmin = true
        }
      } else {
        const { data: approvedClassAccess } = await (admin ?? supabase)
          .from('album_class_access')
          .select('id, status')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle()
        if (!approvedClassAccess) {
          return c.json({ error: 'Album not found' }, 404)
        }
      }
    }
    if (row.type !== 'yearbook') {
      return c.json({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        cover_image_url: row.cover_image_url ?? null,
        cover_image_position: row.cover_image_position ?? null,
        cover_video_url: row.cover_video_url ?? null,
        description: row.description ?? null,
        isOwner,
        classes: [],
      }, 500)
    }
    const { data: classes, error: classesErr } = await client
      .from('album_classes')
      .select('id, name, sort_order, batch_photo_url')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })
    if (classesErr) {
      return c.json({ error: classesErr.message })
    }
    const classList = (classes ?? [])
    const studentCounts: Record<string, number> = {}
    const { data: allAccess } = await client
      .from('album_class_access')
      .select('class_id, status, photos, student_name')
      .eq('album_id', albumId)
    if (allAccess) {
      for (const c of classList) {
        const classMembers = allAccess.filter((a: any) => a.class_id === c.id)
        const validMembers = classMembers.filter((a: any) =>
          a.status === 'approved' || (Array.isArray(a.photos) && a.photos.length > 0)
        )
        const uniqueNames = new Set(validMembers.map((m: any) => m.student_name).filter(Boolean))
        studentCounts[c.id] = uniqueNames.size
      }
    }
    const classesWithCount = classList.map((c: any) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      student_count: studentCounts[c.id] ?? 0,
      batch_photo_url: c.batch_photo_url
    }))
    return c.json({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      cover_image_url: row.cover_image_url ?? null,
      cover_image_position: row.cover_image_position ?? null,
      cover_video_url: row.cover_video_url ?? null,
      description: row.description ?? null,
      flipbook_mode: row.flipbook_mode || 'manual',
      isOwner,
      isAlbumAdmin,
      isGlobalAdmin: isAdmin,
      payment_status: row.payment_status || 'unpaid',
      payment_url: row.payment_url || null,
      total_estimated_price: row.total_estimated_price || 0,
      pricing_package_id: row.pricing_package_id || null,
      classes: classesWithCount,
    })
  } finally {}
})

albumId.patch('/:id', async (c) => {
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
    return c.json({ error: 'Only owner can update' }, 403)
  }
  const body = await c.req.json()
  const { cover_image_url, description, students_count, flipbook_mode, total_estimated_price } = body as any
  const updates: any = {}
  if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url
  if (description !== undefined) updates.description = description
  if (students_count !== undefined) updates.students_count = students_count
  if (flipbook_mode !== undefined) updates.flipbook_mode = flipbook_mode
  if (total_estimated_price !== undefined) updates.total_estimated_price = total_estimated_price
  if (Object.keys(updates).length === 0) return c.json(album, 500)
  const { data: updated, error } = await client
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .select()
    .single()
  if (error) return c.json({ error: error.message })
  return c.json(updated)
})

export default albumId
