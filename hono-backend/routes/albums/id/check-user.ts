import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const checkUserRoute = new Hono()

checkUserRoute.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const supabase = getSupabaseClient(c)

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return c.json({ hasRequest: false }, 500)
    }

    // Use admin client to check if user has a request
    const adminClient = getAdminSupabaseClient(c?.env as any)
    if (!adminClient) {
      return c.json({ error: 'Database connection failed' })
    }

    // Check album_join_requests for pending/rejected requests
    const { data: existing } = await adminClient
      .from('album_join_requests')
      .select('id, status')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()

    // If approved, verify they still have active access in album_class_access or album_members
    if (existing && existing.status === 'approved') {
      // Check if user still has active access
      const { data: classAccess } = await adminClient
        .from('album_class_access')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()

      const { data: memberAccess } = await adminClient
        .from('album_members')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()

      // If they have active access, return approved status
      if (classAccess || memberAccess) {
        return c.json({ hasRequest: true, status: 'approved' }, 500)
      }

      // Approved but no longer has access - allow re-registration
      return c.json({ hasRequest: false })
    }

    // Return pending/rejected status as-is
    if (existing) {
      return c.json({ hasRequest: true, status: existing.status })
    }

    return c.json({ hasRequest: false })
  } catch (error: any) {
    console.error('Error checking user request:', error)
    return c.json({ error: 'Internal server error' })
  }
})

export default checkUserRoute
