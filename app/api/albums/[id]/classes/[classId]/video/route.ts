import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** POST: Upload video profil siswa di kelas. Owner bisa untuk semua siswa; non-owner hanya untuk diri sendiri. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData required' }, { status: 400 })

  const file = formData.get('file') as File | null
  const studentName = (formData.get('student_name') as string | null)?.trim()

  if (!file || !file.size || !studentName) {
    return NextResponse.json({ error: 'file dan student_name required' }, { status: 400 })
  }

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
  if (file.size > MAX_VIDEO_BYTES) return NextResponse.json({ error: 'Video maksimal 20MB' }, { status: 413 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

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
      return NextResponse.json({ error: 'Anda hanya dapat upload video untuk profil Anda sendiri' }, { status: 403 })
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const safeName = studentName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '')
  const path = `${albumId}/${classId}/videos/${safeName}-${Date.now()}.${safeExt}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('album-photos')
    .upload(path, arrayBuffer, { contentType: file.type || 'video/mp4', upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || 'Upload video gagal' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
  const videoUrl = urlData.publicUrl

  const { error: updateErr } = await admin
    .from('album_class_access')
    .update({ video_url: videoUrl, updated_at: new Date().toISOString() })
    .eq('class_id', classId)
    .eq('student_name', studentName)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ video_url: videoUrl })
}
