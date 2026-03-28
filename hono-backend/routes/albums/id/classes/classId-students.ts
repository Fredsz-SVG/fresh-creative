import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const classStudentsRoute = new Hono()

classStudentsRoute.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) return c.json({ error: 'Album ID and class ID required' }, 400)

  const admin = getAdminSupabaseClient(c?.env as any)
  const client = admin ?? supabase

  const { data: cls, error: classErr } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (classErr || !cls) return c.json({ error: 'Class not found' }, 404)

  const { data: accessList, error } = await client
    .from('album_class_access')
    .select('student_name, photos')
    .eq('class_id', classId)

  if (error) return c.json({ error: error.message }, 500)

  const students = (accessList || [])
    .map((r: any) => ({
      student_name: r.student_name,
      photo_count: Array.isArray(r.photos) ? r.photos.length : 0
    }))
    .filter((s: any) => s.photo_count > 0)

  students.sort((a, b) => a.student_name.localeCompare(b.student_name))
  return c.json(students)
})

export default classStudentsRoute
