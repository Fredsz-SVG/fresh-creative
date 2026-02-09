import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** DELETE: Hapus satu foto. Owner bisa hapus semua; non-owner hanya foto milik sendiri (student_name). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, photoId } = await params
  if (!albumId || !photoId) return NextResponse.json({ error: 'Album ID and photo ID required' }, { status: 400 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data: photo, error: photoErr } = await admin
    .from('album_photos')
    .select('id, album_id, class_id, student_name')
    .eq('id', photoId)
    .eq('album_id', albumId)
    .single()

  if (photoErr || !photo) return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 })

  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

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
      return NextResponse.json({ error: 'Anda hanya dapat menghapus foto profil Anda sendiri' }, { status: 403 })
    }
  }

  const { error: delErr } = await admin
    .from('album_photos')
    .delete()
    .eq('id', photoId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ message: 'Foto dihapus' })
}
