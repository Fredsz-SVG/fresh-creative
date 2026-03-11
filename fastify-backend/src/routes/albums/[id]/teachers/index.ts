import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const { id: albumId } = request.params as any
    try {
      const supabase = getSupabaseClient(request)
  
      const { data: teachers, error } = await supabase
        .from('album_teachers')
        .select('id, album_id, name, title, message, photo_url, video_url, sort_order, created_at')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
  
      if (error) {
        console.error('Error fetching teachers:', error)
        return reply.code(500).send({ error: error.message })
      }
  
      if (teachers && teachers.length > 0) {
        const teacherIds = teachers.map(t => t.id)
        const { data: photos } = await supabase
          .from('album_teacher_photos')
          .select('id, teacher_id, file_url, sort_order')
          .in('teacher_id', teacherIds)
          .order('sort_order', { ascending: true })
  
        // Group photos by teacher_id
        const photosByTeacher: Record<string, any[]> = {}
        if (photos) {
          photos.forEach(photo => {
            if (!photosByTeacher[photo.teacher_id]) {
              photosByTeacher[photo.teacher_id] = []
            }
            photosByTeacher[photo.teacher_id].push(photo)
          })
        }
  
        // Add photos array to each teacher
        teachers.forEach(teacher => {
          (teacher as any).photos = photosByTeacher[teacher.id] || []
        })
      }
  
      return reply.send(teachers || [])
    } catch (error: any) {
      console.error('Error in GET /api/albums/[id]/teachers:', error)
      return reply.send({ error: error.message || 'Internal server error' })
    } finally {
      }
  
  })

  server.post('/', async (request: any, reply: any) => {
  
    try {
      const supabase = getSupabaseClient(request)
      const { id: albumId } = request.params as any
      const body = request.body
      const { name, title } = body
  
      if (!name || !name.trim()) {
        return reply.code(400).send({ error: 'Nama guru harus diisi' })
      }
  
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
  
      // Check if user is global admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
  
      const isGlobalAdmin = userData?.role === 'admin'
  
      if (!isGlobalAdmin) {
        // Verify user is album owner or album admin
        const { data: album, error: albumError } = await supabase
          .from('albums')
          .select('user_id')
          .eq('id', albumId)
          .maybeSingle()
  
        if (albumError || !album) {
          return reply.code(404).send({ error: 'Album not found' })
        }
  
        const isOwner = album.user_id === user.id
  
        if (!isOwner) {
          // Check if user is album admin
          const { data: member } = await supabase
            .from('album_members')
            .select('role')
            .eq('album_id', albumId)
            .eq('user_id', user.id)
            .maybeSingle()
  
          if (!member || !['admin', 'owner'].includes(member.role)) {
            return reply.code(403).send({ error: 'Forbidden' })
          }
        }
      }
  
      // Get max sort_order
      const { data: lastTeacher } = await supabase
        .from('album_teachers')
        .select('sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
  
      const nextSortOrder = (lastTeacher?.sort_order ?? -1) + 1
  
      // Insert new teacher
      const { data: newTeachers, error: insertError } = await supabase
        .from('album_teachers')
        .insert({
          album_id: albumId,
          name: name.trim(),
          title: title?.trim() || null,
          sort_order: nextSortOrder,
          created_by: user.id
        })
        .select()
  
      if (insertError) {
        console.error('Error inserting teacher:', insertError)
        return reply.code(500).send({ error: insertError.message })
      }
  
      if (!newTeachers || newTeachers.length === 0) {
        return reply.code(500).send({ error: 'Failed to create teacher' })
      }
  
      return reply.code(201).send(newTeachers[0])
    } catch (error: any) {
      console.error('Error in POST /api/albums/[id]/teachers:', error)
      return reply.code(500).send({ error: error.message || 'Internal server error' })
    }
  
  })

}

export default route
