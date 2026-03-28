import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../../../lib/supabase'

const albumsIdPublic = new Hono()

albumsIdPublic.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    // Use admin client to get public album info without auth
    const supabase = getAdminSupabaseClient(c?.env as any)
    if (!supabase) {
      return c.json({ error: 'Database connection failed' }, 500)
    }
    const { data: album, error } = await supabase
      .from('albums')
      .select('id, name, description, students_count')
      .eq('id', albumId)
      .maybeSingle()
    if (error) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }
    if (!album) {
      return c.json({ error: 'Album tidak ditemukan' }, 404)
    }
    // Fetch album classes so registration form can show them
    const { data: classes } = await supabase
      .from('album_classes')
      .select('id, name, sort_order')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })
    return c.json({ ...album, classes: classes || [] }, 200)
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch album' }, 500)
  }
})

export default albumsIdPublic