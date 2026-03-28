import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const classMemberUserRoute = new Hono()

classMemberUserRoute.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const albumId = c.req.param('id')
    const classId = c.req.param('classId')
    const userId = c.req.param('userId')
    if (!albumId || !classId || !userId) {
      return c.json({ error: 'Album ID, class ID, and user ID required' }, 400)
    }

    const admin = getAdminSupabaseClient(c?.env as any)
    const client = admin ?? supabase

    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const role = await getRole(supabase, user)
    const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
    const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    const isAlbumAdmin = (memberRow as { role?: string } | null)?.role === 'admin'
    const canManage = isOwner || isAlbumAdmin

    if (!canManage && user.id !== userId) {
      return c.json({ error: 'Hanya owner/admin album atau diri sendiri yang bisa menghapus profil' }, 403)
    }

    const { data: cls } = await client
      .from('album_classes')
      .select('id, album_id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()
    if (!cls) return c.json({ error: 'Class not found' }, 404)

    // Find the access record
    const { data: access, error: findErr } = await client
      .from('album_class_access')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle()
    if (findErr) return c.json({ error: findErr.message }, 500)
    if (!access) return c.json({ error: 'Member not found' }, 404)

    // Delete the access record
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
      .eq('user_id', userId)

    // If user has no other class access in this album, remove from album_members so they disappear from "tim"
    const { data: otherAccess } = await client
      .from('album_class_access')
      .select('id')
      .eq('album_id', albumId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (!otherAccess) {
      await client
        .from('album_members')
        .delete()
        .eq('album_id', albumId)
        .eq('user_id', userId)
    }

    return c.json({ success: true }, 200)
  } catch (err: any) {
    console.error('Error deleting member:', err)
    return c.json({ error: 'Server error' }, 500)
  }
})

classMemberUserRoute.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  const userId = c.req.param('userId')
  if (!albumId || !classId || !userId) {
    return c.json({ error: 'Album ID, class ID, and user ID required' }, 400)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const isOwner = (album as { user_id: string }).user_id === user.id
  const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
  const isAlbumAdmin = (memberRow as { role?: string } | null)?.role === 'admin'
  const canManage = isOwner || isAlbumAdmin
  const isEditingSelf = user.id === userId

  if (!isEditingSelf && !canManage) return c.json({ error: 'Hanya owner atau admin album yang bisa menyunting profil orang lain' }, 403)

  const { data: access, error: findErr } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle()
  if (findErr) return c.json({ error: findErr.message }, 500)
  if (!access) return c.json({ error: 'Profil tidak ditemukan' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined
  const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined
  const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined
  const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined
  const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined
  const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined

  if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
    return c.json({ error: 'Minimal satu field required' }, 400)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
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

export default classMemberUserRoute
