import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET: List "students" = siapa saja yang sudah upload di kelas ini (dari album_photos, distinct student_name). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: cls, error: classErr } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (classErr || !cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const { data: accessList, error } = await client
    .from('album_class_access')
    .select('student_name, photos')
    .eq('class_id', classId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const students = (accessList || [])
    .map((r: any) => ({
      student_name: r.student_name,
      photo_count: Array.isArray(r.photos) ? r.photos.length : 0
    }))
    .filter((s: any) => s.photo_count > 0)

  students.sort((a, b) => a.student_name.localeCompare(b.student_name))
  return NextResponse.json(students)
}
