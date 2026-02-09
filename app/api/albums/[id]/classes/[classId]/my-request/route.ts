import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** GET: Akses request saya di kelas ini (pending / rejected). */
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

  const { data: request_data, error } = await client
    .from('album_class_requests')
    .select('id, student_name, email, status, requested_at')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: request_data ?? null })
}
