import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../../../lib/supabase'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })
  
    const { id: albumId, classId } = request.params as any
    if (!albumId || !classId) return reply.code(400).send({ error: 'Album ID and class ID required' })
  
    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase
  
    const { data: cls, error: classErr } = await client
      .from('album_classes')
      .select('id, album_id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()
  
    if (classErr || !cls) return reply.code(404).send({ error: 'Class not found' })
  
    const { data: accessList, error } = await client
      .from('album_class_access')
      .select('student_name, photos')
      .eq('class_id', classId)
  
    if (error) return reply.code(500).send({ error: error.message })
  
    const students = (accessList || [])
      .map((r: any) => ({
        student_name: r.student_name,
        photo_count: Array.isArray(r.photos) ? r.photos.length : 0
      }))
      .filter((s: any) => s.photo_count > 0)
  
    students.sort((a, b) => a.student_name.localeCompare(b.student_name))
    return reply.send(students)
  
  })

}

export default route
