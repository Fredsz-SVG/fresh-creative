import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

const albumCoverVideoRoute = new Hono()

// POST /api/albums/:id/cover-video
albumCoverVideoRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'video/mp4'

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file && file instanceof File) {
      fileData = await file.arrayBuffer()
      filename = file.name || 'cover-video.mp4'
      mimetype = file.type || 'video/mp4'
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0) return c.json({ error: 'file required' }, 400)

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024
  if (fileData.byteLength > MAX_VIDEO_BYTES) return c.json({ error: 'Video maksimal 20MB' }, 413)

  const { data: album, error: albumErr } = await supabase
    .from('albums').select('id, user_id').eq('id', albumId).single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if ((album as any).user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat mengubah video sampul' }, 403)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const path = `${albumId}/cover-video.${safeExt}`

  const { error: uploadErr } = await admin.storage
    .from('album-photos')
    .upload(path, fileData, { contentType: mimetype, upsert: true })

  if (uploadErr) return c.json({ error: uploadErr.message || 'Upload video sampul gagal' }, 500)

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
  const videoUrl = urlData.publicUrl

  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_video_url: videoUrl, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return c.json({ error: updateErr.message }, 500)
  return c.json({ cover_video_url: videoUrl })
})

// DELETE /api/albums/:id/cover-video
albumCoverVideoRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const { data: album, error: albumErr } = await supabase
    .from('albums').select('id, user_id').eq('id', albumId).single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if ((album as any).user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat menghapus video sampul' }, 403)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_video_url: null, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return c.json({ error: updateErr.message }, 500)
  return c.json({ message: 'Video sampul dihapus' })
})

export default albumCoverVideoRoute
