import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../lib/supabase'
import { getRole } from '../../../../../lib/auth'

const classRequestsRoute = new Hono()

classRequestsRoute.get('/', async (c) => {
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
  const albumRow = album as { user_id: string }
  const isOwner = albumRow.user_id === user.id
  const globalRole = await getRole(supabase, user)
  if (!isOwner && globalRole !== 'admin') {
    const { data: member } = await client
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
    if (!isAlbumAdmin) {
      return c.json({ error: 'Only owner or album admin can list requests' }, 403)
    }
  }

  const { data: cls } = await client.from('album_classes').select('id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return c.json({ error: 'Class not found' }, 404)

  const statusFilter = c.req.query('status') ?? 'pending'

  // Pending requests berasal dari album_join_requests
  if (statusFilter === 'pending') {
    try {
      const { data: list, error } = await client
        .from('album_join_requests')
        .select('id, user_id, student_name, email, status, requested_at')
        .eq('assigned_class_id', classId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
      if (error) {
        return c.json({ error: 'Failed to fetch pending requests', details: error.message, code: error.code }, 500)
      }
      return c.json(list ?? [], 500)
    } catch (err) {
      return c.json({ error: 'Server error fetching requests' })
    }
  }

  // Approved/rejected requests berasal dari album_class_access
  try {
    let query = client
      .from('album_class_access')
      .select('id, user_id, student_name, email, status, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    const { data: list, error } = await query
    if (error) {
      return c.json({ error: 'Failed to fetch access requests', details: error.message, code: error.code }, 500)
    }
    return c.json(list ?? [], 500)
  } catch (err) {
    return c.json({ error: 'Server error fetching requests' })
  }
})

export default classRequestsRoute
