import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET: List photos. Query: class_id (required), student_name (optional = all students in class). Owner/admin pakai admin client agar bisa baca semua foto (RLS hanya izinkan owner/member). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const studentName = searchParams.get('student_name')

  if (!classId) return NextResponse.json({ error: 'class_id required' }, { status: 400 })

  const admin = createAdminClient()
  const role = await getRole(supabase, user)
  const { data: album } = await (admin ?? supabase).from('albums').select('id, user_id').eq('id', albumId).single()
  const isOwnerOrAdmin = album && ((album as { user_id: string }).user_id === user.id || role === 'admin')
  const client = isOwnerOrAdmin && admin ? admin : supabase

  const { data: cls } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  let query = client
    .from('album_class_access')
    .select('student_name, photos, created_at')
    .eq('album_id', albumId)
    .eq('class_id', classId)

  if (studentName != null && studentName !== '') {
    query = query.eq('student_name', decodeURIComponent(studentName))
  }

  const { data: records, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Transform records to flat photo list for compatibility
  const photos = (records || []).flatMap((r: any) => {
    const studentPhotos = (r.photos as string[]) || []
    return studentPhotos.map((url, idx) => ({
      id: `${r.student_name}-${idx}`,
      file_url: url,
      student_name: r.student_name,
      created_at: r.created_at
    }))
  })

  return NextResponse.json(photos)
}

/** POST: Upload photo. Body: FormData with file, class_id, student_name. User must have approved access for that class. */
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
  const classId = formData.get('class_id') as string | null
  const studentName = (formData.get('student_name') as string | null)?.trim()

  if (!file || !classId || !studentName) {
    return NextResponse.json({ error: 'file, class_id, and student_name required' }, { status: 400 })
  }

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Foto maksimal 10MB' }, { status: 413 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const role = await getRole(supabase, user)
  const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'
  if (!isOwner) {
    // Check if user is album member (admin/helper)
    const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    if (!member) {
      // Check if user has approved class access (student who was approved)
      const { data: classAccess } = await client
        .from('album_class_access')
        .select('id')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()
      
      if (!classAccess) {
        return NextResponse.json({ error: 'No access to album' }, { status: 403 })
      }
    }
  }

  const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  if (!isOwner) {
    const { data: access } = await client
      .from('album_class_access')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('student_name', studentName)
      .maybeSingle()

    if (!access) {
      return NextResponse.json({ error: 'Anda harus punya akses disetujui untuk nama ini di kelas ini' }, { status: 403 })
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const path = `${albumId}/${classId}/${crypto.randomUUID()}.${safeExt}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('album-photos')
    .upload(path, arrayBuffer, { contentType: file.type || 'image/jpeg', upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || 'Upload gagal' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('album-photos').getPublicUrl(uploadData.path)
  const fileUrl = urlData.publicUrl

  // Check current photos in album_class_access
  const { data: accessRecord } = await client
    .from('album_class_access')
    .select('photos')
    .eq('album_id', albumId)
    .eq('class_id', classId)
    .eq('student_name', studentName)
    .maybeSingle()

  if (!accessRecord) {
    return NextResponse.json({ error: 'Access record not found' }, { status: 404 })
  }

  const currentPhotos = (accessRecord.photos as string[]) || []

  // Check if already at max capacity
  if (currentPhotos.length >= 4) {
    return NextResponse.json({ error: 'Maksimal 4 foto per siswa' }, { status: 400 })
  }

  // Append new photo to array
  const updatedPhotos = [...currentPhotos, fileUrl]

  const { error: updateErr } = await client
    .from('album_class_access')
    .update({ photos: updatedPhotos })
    .eq('album_id', albumId)
    .eq('class_id', classId)
    .eq('student_name', studentName)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({
    id: crypto.randomUUID(),
    file_url: fileUrl,
    student_name: studentName,
    photo_index: updatedPhotos.length - 1,
    total_photos: updatedPhotos.length
  })
}

/** DELETE: Remove photo by index from photos array */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const studentName = searchParams.get('student_name')
  const indexStr = searchParams.get('index')

  if (!classId || !studentName || indexStr === null) {
    return NextResponse.json({ error: 'class_id, student_name, and index required' }, { status: 400 })
  }

  const index = parseInt(indexStr)
  if (isNaN(index)) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 })
  }

  const admin = createAdminClient()
  const client = admin ?? supabase

  // Verify ownership/access permissions (similar to POST/GET)
  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const role = await getRole(supabase, user)
  const isOwner = (album as { user_id: string }).user_id === user.id || role === 'admin'

  if (!isOwner) {
    const { data: member } = await client
      .from('album_members')
      .select('album_id')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      const accessClient = admin ?? supabase
      const { data: access } = await accessClient
        .from('album_class_access')
        .select('id, user_id, student_name')
        .eq('album_id', albumId)
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()

      if (!access) {
        return NextResponse.json({ error: 'Anda hanya dapat menghapus foto Anda sendiri' }, { status: 403 })
      }

      // Verify student name matches (user can only delete their own profile's photos)
      if (access.student_name !== studentName) {
        return NextResponse.json({ error: 'Anda hanya dapat menghapus foto dari profil Anda sendiri' }, { status: 403 })
      }
    }
  }

  // Fetch current photos
  const { data: accessRecord } = await client
    .from('album_class_access')
    .select('photos')
    .eq('album_id', albumId)
    .eq('class_id', classId)
    .eq('student_name', studentName)
    .maybeSingle()

  if (!accessRecord) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  const currentPhotos = (accessRecord.photos as string[]) || []
  if (index < 0 || index >= currentPhotos.length) {
    return NextResponse.json({ error: 'Photo index out of bounds' }, { status: 400 })
  }

  // Remove photo at index
  const updatedPhotos = [...currentPhotos]
  updatedPhotos.splice(index, 1)

  const { error: updateErr } = await client
    .from('album_class_access')
    .update({ photos: updatedPhotos })
    .eq('album_id', albumId)
    .eq('class_id', classId)
    .eq('student_name', studentName)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true, remaining_photos: updatedPhotos.length })
}
