import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const classMembersRoute = new Hono()

classMembersRoute.get('/', async (c) => {
  try {
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

    const role = await getRole(supabase, user)
    const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
    if (!isOwner) {
      // Check if user is album member (admin/helper)
      const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
      if (!member) {
        // Check if user has approved class access (student who was approved)
        const { data: classAccess } = await client
          .from('album_class_access')
          .select('id')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle()
        if (!classAccess) {
          return c.json({ error: 'Tidak punya akses ke album ini' }, 403)
        }
      }
    }

    const { data: cls } = await client
      .from('album_classes')
      .select('id, album_id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()

    if (!cls) return c.json({ error: 'Class not found' }, 404)

    const { data: list, error } = await client
      .from('album_class_access')
      .select('user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
      .eq('class_id', classId)
      .in('status', ['approved', 'pending'])
      .order('student_name', { ascending: true })

    if (error) {
      console.error('Supabase query error:', error)
      return c.json({ error: error.message }, 500)
    }

    const members = (list ?? [])
      .filter((r: any) => isOwner || r.status === 'approved')
      .map((r: { user_id: string; student_name: string; email?: string | null; date_of_birth?: string | null; instagram?: string | null; message?: string | null; video_url?: string | null; photos?: string[]; status?: string }) => ({
        user_id: r.user_id,
        student_name: r.student_name,
        email: r.email ?? null,
        date_of_birth: r.date_of_birth ?? null,
        instagram: r.instagram ?? null,
        message: r.message ?? null,
        video_url: r.video_url ?? null,
        photos: r.photos ?? [],
        is_me: r.user_id === user.id,
        status: r.status,
      }))

    return c.json(members, 500)
  } catch (err: any) {
    console.error('Error fetching members:', err)
    return c.json({ error: 'Internal server error' })
  }
})

export default classMembersRoute
