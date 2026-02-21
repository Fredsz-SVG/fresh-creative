import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** POST: Upload album cover image. Owner only. Body: FormData with file. Uses admin client for storage to bypass RLS. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData required' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file || !file.size) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Foto maksimal 10MB' }, { status: 413 })

  const positionX = formData.get('position_x') as string | null
  const positionY = formData.get('position_y') as string | null
  const coverPosition =
    positionX != null && positionY != null && positionX !== '' && positionY !== ''
      ? `${positionX}% ${positionY}%`
      : null

  const { data: album, error: albumErr } = await supabase
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Hanya pemilik album yang dapat mengubah sampul' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${albumId}/cover.${safeExt}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadErr } = await admin.storage
    .from('album-photos')
    .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || 'Upload gagal' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(uploadData.path)
  const coverUrl = urlData.publicUrl

  const updatePayload: { cover_image_url: string; cover_image_position?: string } = { cover_image_url: coverUrl }
  if (coverPosition != null) updatePayload.cover_image_position = coverPosition

  const { error: updateErr } = await admin
    .from('albums')
    .update(updatePayload)
    .eq('id', albumId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ cover_image_url: coverUrl, cover_image_position: coverPosition ?? undefined })
}

/** DELETE: Hapus sampul album. Owner only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
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
    return NextResponse.json({ error: 'Hanya pemilik album yang dapat menghapus sampul' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { error: updateErr } = await admin
    .from('albums')
    .update({ cover_image_url: null, cover_image_position: null, updated_at: new Date().toISOString() })
    .eq('id', albumId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ message: 'Sampul dihapus' })
}
