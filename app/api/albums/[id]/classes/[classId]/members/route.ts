import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET: Daftar anggota kelas (yang sudah approved) untuk tampilan personal per orang. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId, classId } = await params
    if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

    const admin = createAdminClient()
    const client = admin ?? supabase

    const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

    const role = await getRole(supabase, user)
    const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
    if (!isOwner) {
      const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
      if (!member) return NextResponse.json({ error: 'Tidak punya akses ke album ini' }, { status: 403 })
    }

    const { data: cls } = await client
      .from('album_classes')
      .select('id, album_id')
      .eq('id', classId)
      .eq('album_id', albumId)
      .single()

    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    const { data: list, error } = await client
      .from('album_class_access')
      .select('user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
      .eq('class_id', classId)
      .in('status', ['approved', 'pending'])
      .order('student_name', { ascending: true })

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const members = (list ?? [])
      .filter((r: any) => isOwner || r.status === 'approved')
      .map((r: { user_id: string; student_name: string; email?: string | null; date_of_birth?: string | null; instagram?: string | null; message?: string | null; video_url?: string | null; photos?: string[]; status?: string }) => ({
        user_id: r.user_id,
        student_name: r.student_name,
        email: r.email ?? null,
        date_of_birth: r.date_of_birth ?? null,
        instagram: r.instagram ?? null,
        message: r.message ?? null,
        video_url: r.video_url ?? null,
        photos: r.photos ?? [],
        is_me: r.user_id === user.id,
        status: r.status,
      }))

    return NextResponse.json(members)
  } catch (err) {
    console.error('Error fetching members:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
