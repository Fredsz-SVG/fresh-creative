import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })
  
    let fileBuffer: Buffer | null = null
    let filename = ''
    let mimetype = 'video/mp4'

    try {
      const parts = request.parts()
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileBuffer = await part.toBuffer()
          filename = part.filename || 'cover-video.mp4'
          mimetype = part.mimetype || 'video/mp4'
          break
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return reply.code(400).send({ error: msg || 'Invalid multipart body' })
    }

    if (!fileBuffer || fileBuffer.length === 0) return reply.code(400).send({ error: 'file required' })
  
    const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
    if (fileBuffer.length > MAX_VIDEO_BYTES) return reply.code(413).send({ error: 'Video maksimal 20MB' })
  
    const { data: album, error: albumErr } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })
    const role = await getRole(supabase, user)
    if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
      return reply.code(403).send({ error: 'Hanya pemilik album yang dapat mengubah video sampul' })
    }
  
    const admin = getAdminSupabaseClient()
    if (!admin) return reply.code(500).send({ error: 'Server configuration error' })
  
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
    const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
    const path = `${albumId}/cover-video.${safeExt}`
  
    const { error: uploadErr } = await admin.storage
      .from('album-photos')
      .upload(path, fileBuffer, { contentType: mimetype, upsert: true })
  
    if (uploadErr) {
      return reply.code(500).send({ error: uploadErr.message || 'Upload video sampul gagal' })
    }
  
    const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
    const videoUrl = urlData.publicUrl
  
    const { error: updateErr } = await admin
      .from('albums')
      .update({ cover_video_url: videoUrl, updated_at: new Date().toISOString() })
      .eq('id', albumId)
  
    if (updateErr) return reply.code(500).send({ error: updateErr.message })
    return reply.send({ cover_video_url: videoUrl })
  
  })

  server.delete('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })
  
    const { data: album, error: albumErr } = await supabase
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })
    const role = await getRole(supabase, user)
    if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
      return reply.code(403).send({ error: 'Hanya pemilik album yang dapat menghapus video sampul' })
    }
  
    const admin = getAdminSupabaseClient()
    if (!admin) return reply.code(500).send({ error: 'Server configuration error' })
  
    const { error: updateErr } = await admin
      .from('albums')
      .update({ cover_video_url: null, updated_at: new Date().toISOString() })
      .eq('id', albumId)
  
    if (updateErr) return reply.code(500).send({ error: updateErr.message })
    return reply.send({ message: 'Video sampul dihapus' })
  
  })

}

export default route
