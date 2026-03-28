import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'

const albumsIdMyAccessAll = new Hono()

albumsIdMyAccessAll.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return c.json({ access: {}, requests: {} })
    }

    const albumId = c.req.param('id')
    if (!albumId) {
      return c.json({ error: 'Album ID required' }, 400)
    }

    const [accessRes, requestsRes] = await Promise.all([
      supabase
        .from('album_class_access')
        .select('id, class_id, album_id, user_id, student_name, email, status, date_of_birth, instagram, message, video_url, photos, created_at')
        .eq('album_id', albumId)
        .eq('user_id', user.id),
      supabase
        .from('album_join_requests')
        .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
    ])

    if (accessRes.error) throw accessRes.error
    if (requestsRes.error) throw requestsRes.error

    const accessByClass: Record<string, any> = {}
    accessRes.data?.forEach((item: any) => {
      if (item.class_id) accessByClass[item.class_id] = item
    })

    const requestsByClassMap: Record<string, any> = {}
    requestsRes.data?.forEach((item: any) => {
      if (item.assigned_class_id) requestsByClassMap[item.assigned_class_id] = item
    })

    return c.json({ access: accessByClass, requests: requestsByClassMap })
  } catch (err: any) {
    console.error('Error in my-access-all:', err)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  }
})

export default albumsIdMyAccessAll