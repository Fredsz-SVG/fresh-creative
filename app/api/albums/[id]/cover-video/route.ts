import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** POST: Upload video sampul album. Owner only. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData required' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file || !file.size) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const { data: album, error: albumErr } = await supabase
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Hanya pemilik album yang dapat mengubah video sampul' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const safeExt = ['mp4', 'webm', 'mov', 'avi'].includes(ext) ? ext : 'mp4'
  const path = `${albumId}/cover-video.${safeExt}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('album-photos')
    .upload(path, arrayBuffer, { contentType: file.type || 'video/mp4', upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || 'Upload video sampul gagal' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(path)
  const videoUrl = urlData.publicUrl

  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_video_url: videoUrl, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ cover_video_url: videoUrl })
}

/** DELETE: Hapus video sampul album. Owner only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const { data: album, error: albumErr } = await supabase
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Hanya pemilik album yang dapat menghapus video sampul' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_video_url: null, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ message: 'Video sampul dihapus' })
}
