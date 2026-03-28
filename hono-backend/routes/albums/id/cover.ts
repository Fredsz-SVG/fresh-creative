import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

const albumCoverRoute = new Hono()

// POST /api/albums/:id/cover
albumCoverRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  let fileData: ArrayBuffer | null = null
  let filename = ''
  let mimetype = 'image/jpeg'
  let positionX: string | null = null
  let positionY: string | null = null

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (file && file instanceof File) {
      fileData = await file.arrayBuffer()
      filename = file.name || 'cover.jpg'
      mimetype = file.type || 'image/jpeg'
    }
    const px = formData.get('position_x')
    const py = formData.get('position_y')
    if (px) positionX = px.toString()
    if (py) positionY = py.toString()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg || 'Invalid multipart body' }, 400)
  }

  if (!fileData || fileData.byteLength === 0) return c.json({ error: 'file required' }, 400)

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024
  if (fileData.byteLength > MAX_PHOTO_BYTES) return c.json({ error: 'Foto maksimal 10MB' }, 413)

  const coverPosition =
    positionX != null && positionY != null && positionX !== '' && positionY !== ''
      ? `${positionX}% ${positionY}%`
      : null

  const { data: album, error: albumErr } = await supabase
    .from('albums').select('id, user_id').eq('id', albumId).single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)
  const role = await getRole(supabase, user)
  if ((album as any).user_id !== user.id && role !== 'admin') {
    return c.json({ error: 'Hanya pemilik album yang dapat mengubah sampul' }, 403)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${albumId}/cover.${safeExt}`

  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('album-photos')
    .upload(path, fileData, { contentType: mimetype, upsert: true })

  if (uploadErr) return c.json({ error: uploadErr.message || 'Upload gagal' }, 500)

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(uploadData.path)
  const coverUrl = urlData.publicUrl

  const updatePayload: { cover_image_url: string; cover_image_position?: string } = { cover_image_url: coverUrl }
  if (coverPosition != null) updatePayload.cover_image_position = coverPosition

  const { error: updateErr } = await admin.from('albums').update(updatePayload).eq('id', albumId)
  if (updateErr) return c.json({ error: updateErr.message }, 500)
  return c.json({ cover_image_url: coverUrl, cover_image_position: coverPosition ?? undefined })
})

// DELETE /api/albums/:id/cover
albumCoverRoute.delete('/', async (c) => {
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
    return c.json({ error: 'Hanya pemilik album yang dapat menghapus sampul' }, 403)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_image_url: null, cover_image_position: null, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return c.json({ error: updateErr.message }, 500)
  return c.json({ message: 'Sampul dihapus' })
})

export default albumCoverRoute
