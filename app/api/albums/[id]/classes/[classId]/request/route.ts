import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** POST: Siswa/owner mengajukan nama di kelas (nama, email). Semua status pending; owner/member harus di-approve (termasuk owner approve diri sendiri). */
export async function POST(
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

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const isOwner = (album as { user_id: string }).user_id === user.id
  if (!isOwner) {
    const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    if (!member) return NextResponse.json({ error: 'Anda harus bergabung ke album dulu via link undangan' }, { status: 403 })
  }

  const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single()
  if (!cls) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : (user.email ?? '')

  if (!student_name) return NextResponse.json({ error: 'Nama siswa wajib' }, { status: 400 })

  // Check album_class_access untuk approved access
  const { data: existingAccess } = await client
    .from('album_class_access')
    .select('id, status')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Check album_join_requests untuk pending request
  const { data: existingRequest } = await client
    .from('album_join_requests')
    .select('id, status')
    .eq('assigned_class_id', classId)
    .eq('user_id', user.id)
    .maybeSingle()

  // Jika sudah approved di album_class_access, return approved data
  if (existingAccess) {
    const row = existingAccess as { status: string }
    if (row.status === 'approved') {
      const { data: fullAccess } = await client.from('album_class_access').select().eq('id', (existingAccess as { id: string }).id).single()
      return NextResponse.json(fullAccess ?? existingAccess)
    }
    // Jika rejected, update ke request baru
    if (row.status === 'rejected') {
      // Delete dari access dan create request baru
      await client.from('album_class_access').delete().eq('id', (existingAccess as { id: string }).id)
    }
  }

  // Jika sudah pending di album_join_requests, return pending data
  const existingReq = existingRequest as { id: string; status: string } | null
  if (existingReq?.status === 'pending') {
    const { data: fullRequest } = await client.from('album_join_requests').select().eq('id', existingReq.id).single()
    return NextResponse.json(fullRequest ?? existingRequest)
  }

  // Jika rejected, update jadi pending dengan nama/email baru (ajukan ulang)
  if (existingReq?.status === 'rejected') {
    const { data: updated, error: updateErr } = await client
      .from('album_join_requests')
      .update({ student_name, email: email || null, status: 'pending' })
      .eq('id', existingReq.id)
      .select()
      .single()
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  // Create new pending request di album_join_requests
  const { data: created, error } = await client
    .from('album_join_requests')
    .insert({
      album_id: albumId,
      assigned_class_id: classId,
      user_id: user.id,
      student_name,
      email: email || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(created)
}
