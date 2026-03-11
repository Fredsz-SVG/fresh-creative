import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../../lib/supabase'
import { getRole } from '../../../../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId, classId } = request.params as any
    if (!albumId || !classId) return reply.code(400).send({ error: 'Album ID and class ID required' })
  
    let fileBuffer: Buffer | null = null
    let filename = ''
    let mimetype = 'video/mp4'
    let studentName = ''
    try {
      const parts = request.parts()
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileBuffer = await part.toBuffer()
          filename = part.filename || 'video.mp4'
          mimetype = part.mimetype || 'video/mp4'
        } else if (part.type === 'field' && part.fieldname === 'student_name') {
          studentName = String(part.value ?? '').trim()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return reply.code(400).send({ error: msg || 'Invalid multipart body' })
    }
  
    if (!fileBuffer || fileBuffer.length === 0 || !studentName) {
      return reply.code(400).send({ error: 'file dan student_name required' })
    }
  
    const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
    if (fileBuffer.length > MAX_VIDEO_BYTES) return reply.code(413).send({ error: 'Video maksimal 20MB' })
  
    const admin = getAdminSupabaseClient()
    if (!admin) return reply.code(500).send({ error: 'Server configuration error' })
  
    const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return reply.code(404).send({ error: 'Album not found' })
  
    const role = await getRole(supabase, user)
    const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
    if (!isOwner) {
      const { data: access } = await admin
        .from('album_class_access')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('student_name', studentName)
        .maybeSingle()
      if (!access) {
        return reply.code(403).send({ error: 'Anda hanya dapat upload video untuk profil Anda sendiri' })
      }
    }
  
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
    const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
    const safeName = studentName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '')
    const path = `${albumId}/${classId}/videos/${safeName}-${Date.now()}.${safeExt}`
  
    const { error: uploadErr } = await admin.storage
      .from('album-photos')
      .upload(path, fileBuffer, { contentType: mimetype, upsert: false })
  
    if (uploadErr) {
      return reply.code(500).send({ error: uploadErr.message || 'Upload video gagal' })
    }
  
    const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
    const videoUrl = urlData.publicUrl
  
    const { error: updateErr } = await admin
      .from('album_class_access')
      .update({ video_url: videoUrl, updated_at: new Date().toISOString() })
      .eq('class_id', classId)
      .eq('student_name', studentName)
  
    if (updateErr) return reply.code(500).send({ error: updateErr.message })
  
    // Invalidate cache so subsequent fetches return fresh data with video_url
    return reply.send({ video_url: videoUrl })
  
  })

}

export default route
