import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../lib/supabase'
import { getRole } from '../../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.delete('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId, photoId } = request.params as any
    if (!albumId || !photoId) return reply.code(400).send({ error: 'Album ID and photo ID required' })
  
    const admin = getAdminSupabaseClient()
    if (!admin) return reply.code(500).send({ error: 'Server configuration error' })
  
    const { data: photo, error: photoErr } = await admin
      .from('album_photos')
      .select('id, album_id, class_id, student_name')
      .eq('id', photoId)
      .eq('album_id', albumId)
      .single()
  
    if (photoErr || !photo) return reply.code(404).send({ error: 'Foto tidak ditemukan' })
  
    const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return reply.code(404).send({ error: 'Album not found' })
  
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
        return reply.code(403).send({ error: 'Anda hanya dapat menghapus foto profil Anda sendiri' })
      }
    }
  
    const { error: delErr } = await admin
      .from('album_photos')
      .delete()
      .eq('id', photoId)
  
    if (delErr) return reply.code(500).send({ error: delErr.message })
    return reply.send({ message: 'Foto dihapus' })
  
  })

}

export default route
