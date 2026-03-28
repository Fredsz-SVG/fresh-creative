import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

const albumFlipbookRoute = new Hono()

// GET /api/albums/:id/flipbook/public — no auth, for public showcase
albumFlipbookRoute.get('/public', async (c) => {
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  try {
    const admin = getAdminSupabaseClient(c?.env as any)
    const { data: album } = await admin.from('albums').select('id, name').eq('id', albumId).maybeSingle()
    if (!album) return c.json({ error: 'Album not found' }, 404)
    const { data: pages, error } = await admin
      .from('manual_flipbook_pages')
      .select('*, flipbook_video_hotspots(*)')
      .eq('album_id', albumId)
      .order('page_number', { ascending: true })
    if (error) return c.json({ error: error.message }, 500)
    return c.json({ pages: pages || [], albumName: album.name || 'Preview Flipbook' })
  } catch (e: any) {
    return c.json({ error: 'Failed to load flipbook' }, 500)
  }
})

// POST /api/albums/:id/flipbook — clean flipbook assets (admin/owner only)
albumFlipbookRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase
  // 1. Permission Check
  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  const isOwner = album.user_id === user.id || role === 'admin'
  if (!isOwner) {
    // Check album_members for album admin
    const { data: member } = await client
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member || member.role !== 'admin') {
      return c.json({ error: 'Only administrators can clean flipbook' }, 403)
    }
  }
  try {
    // 2. Clear Database (using RPC)
    const { error: dbError } = await client.rpc('cleanup_manual_flipbook', { target_album_id: albumId })
    if (dbError) throw dbError
    // 3. Clear Storage (not implemented in Workers, see Fastify for details)
    return c.json({ message: 'Flipbook assets cleaned successfully (DB only, storage cleanup not implemented in Workers)' })
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

// GET /api/albums/:id/flipbook — get flipbook pages
albumFlipbookRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const albumId = c.req.param('id')
  const { data: pages, error } = await supabase
    .from('manual_flipbook_pages')
    .select('*, flipbook_video_hotspots(*)')
    .eq('album_id', albumId)
    .order('page_number', { ascending: true })
  if (error) return c.json({ error: error.message }, 500)
  return c.json(pages)
})

export default albumFlipbookRoute
