import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'

const albumsIdJoinStats = new Hono()

albumsIdJoinStats.get('/', async (c) => {
  try {
    const albumId = c.req.param('id')
    const supabase = getSupabaseClient(c)

    // Call the stats function
    const { data, error } = await supabase.rpc('get_album_join_stats', {
      _album_id: albumId
    })

    if (error) throw error

    const stats = data?.[0] || {
      limit_count: null,
      approved_count: 0,
      pending_count: 0,
      rejected_count: 0,
      available_slots: 999999
    }

    return c.json(stats)
  } catch (error) {
    console.error('Error fetching join stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

export default albumsIdJoinStats
