import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  
    const { id: albumId, classId } = request.params as any
    if (!albumId || !classId) {
      return reply.code(400).send({ error: 'Album ID and class ID required' })
    }
  
    const admin = getAdminSupabaseClient()
    if (!admin) {
      return reply.code(500).send({ error: 'Admin client not available' })
    }
  
    // 1. Verify user is album owner
    const { data: album, error: albumErr } = await admin
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) {
      return reply.code(404).send({ error: 'Album not found' })
    }
  
    if (album.user_id !== user.id) {
      return reply.code(403).send({ error: 'Only album owner can use this endpoint' })
    }
  
    // 2. Verify class exists and belongs to this album
    const { data: classData, error: classErr } = await admin
      .from('album_classes')
      .select('id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()
  
    if (classErr || !classData) {
      return reply.code(404).send({ error: 'Class not found' })
    }
  
    // 3. Check if owner already registered in ANY class in this album (limit: 1 class only)
    const { data: anyAccess } = await admin
      .from('album_class_access')
      .select('id, class_id, student_name')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
  
    if (anyAccess) {
      // If already registered in this class
      if (anyAccess.class_id === classId) {
        return reply.code(400).send({ 
          error: 'Anda sudah terdaftar di kelas ini',
          access: anyAccess 
        })
      }
      
      // If already registered in another class
      return reply.code(400).send({ 
        error: 'Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.',
        existingClassId: anyAccess.class_id
      })
    }
  
    // 4. Get profile data: dari body, atau bawaan dari akun web (nama & email login)
    const body = (request.body || {})
    const fullName = (user.user_metadata?.full_name as string)?.trim() || ''
    const userEmail = (user.email as string)?.trim() || null
    const studentName = typeof body?.student_name === 'string' && body.student_name.trim()
      ? body.student_name.trim()
      : (fullName || userEmail || '')
    const email = typeof body?.email === 'string' && body.email.trim()
      ? body.email.trim()
      : userEmail
  
    // 5. Insert owner into album_class_access with approved status (bypass RLS)
    const { data: newAccess, error: insertErr } = await admin
      .from('album_class_access')
      .insert({
        album_id: albumId,
        class_id: classId,
        user_id: user.id,
        student_name: studentName,
        email: email,
        status: 'approved', // Owner langsung approved
      })
      .select()
      .single()
  
    if (insertErr) {
      console.error('[JOIN AS OWNER] Insert error:', insertErr)
      return reply.code(500).send({ 
        error: 'Gagal menambahkan owner ke kelas',
        details: insertErr.message 
      })
    }
  
    return reply.send({
      success: true,
      access: newAccess,
      message: 'Berhasil menambahkan diri ke kelas'
    })
  
  })

}

export default route
