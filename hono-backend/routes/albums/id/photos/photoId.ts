import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const albumsIdPhotosPhotoId = new Hono()

// DELETE /api/albums/:id/photos/:photoId
albumsIdPhotosPhotoId.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const photoId = c.req.param('photoId')
  if (!albumId || !photoId) return c.json({ error: 'Album ID and photo ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  if (!admin) return c.json({ error: 'Server configuration error' }, 500)

  const { data: photo, error: photoErr } = await admin
    .from('album_photos')
    .select('id, album_id, class_id, student_name')
    .eq('id', photoId)
    .eq('album_id', albumId)
    .single()
  if (photoErr || !photo) return c.json({ error: 'Foto tidak ditemukan' }, 404)

  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const role = await getRole(supabase, user)
  const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
  if (!isOwner) {
    const { data: access } = await admin
      .from('album_class_access')
      .select('id')
      .eq('class_id', (photo as { class_id: string }).class_id)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('student_name', (photo as { student_name: string }).student_name)
      .maybeSingle()
    if (!access) {
      return c.json({ error: 'Anda hanya dapat menghapus foto profil Anda sendiri' }, 403)
    }
  }

  const { error: delErr } = await admin
    .from('album_photos')
    .delete()
    .eq('id', photoId)
  if (delErr) return c.json({ error: delErr.message }, 500)
  return c.json({ message: 'Foto dihapus' })
})

export default albumsIdPhotosPhotoId
