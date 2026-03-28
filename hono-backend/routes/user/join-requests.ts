import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const userJoinRequests = new Hono()

userJoinRequests.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const adminClient = getAdminSupabaseClient(c?.env as any)

    const { data: pendingRequests, error: pendingError } = await adminClient
      .from('album_join_requests')
      .select('id, album_id, student_name, class_name, email, status, requested_at')
      .eq('user_id', user.id).in('status', ['pending', 'rejected'])
      .order('requested_at', { ascending: false })

    if (pendingError) return c.json({ error: 'Failed to fetch join requests' }, 500)

    const { data: approvedAccess } = await adminClient
      .from('album_class_access')
      .select('id, album_id, class_id, student_name, email, status, created_at')
      .eq('user_id', user.id).eq('status', 'approved')
      .order('created_at', { ascending: false })

    const allRequests: any[] = [
      ...(pendingRequests || []),
      ...(approvedAccess || []).map((acc: any) => ({ ...acc, requested_at: acc.created_at })),
    ]

    if (allRequests.length > 0) {
      const albumIds = [...new Set(allRequests.map(r => r.album_id))]
      const classIds = [...new Set(allRequests.map(r => r.class_id).filter(Boolean))]

      const { data: albums } = await adminClient.from('albums').select('id, name').in('id', albumIds)
      const { data: classes } = classIds.length > 0
        ? await adminClient.from('album_classes').select('id, name').in('id', classIds)
        : { data: null }

      const albumMap = new Map(albums?.map((a: any) => [a.id, a.name]) || [])
      const classMap = new Map(classes?.map((c: any) => [c.id, c.name]) || [])

      return c.json(allRequests.map((req: any) => ({
        ...req,
        album_name: albumMap.get(req.album_id) || 'Unknown Album',
        class_name: req.class_name || (req.class_id ? classMap.get(req.class_id) : null) || null,
      })))
    }

    return c.json([])
  } catch (error) {
    console.error('Error in user join-requests:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default userJoinRequests