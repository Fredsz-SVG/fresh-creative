import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** PATCH: Owner approve/reject permintaan. Body: { status: 'approved' | 'rejected' } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string; requestId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId, requestId } = await params
  if (!albumId || !classId || !requestId) return NextResponse.json({ error: 'IDs required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const albumRow = album as { user_id: string }
  const isOwner = albumRow.user_id === user.id
  const globalRole = await getRole(supabase, user)
  if (!isOwner && globalRole !== 'admin') {
    const { data: member } = await client
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', user.id)
      .maybeSingle()
    const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
    if (!isAlbumAdmin) {
      return NextResponse.json({ error: 'Only owner or album admin can approve/reject' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => ({}))
  const status = body?.status === 'approved' ? 'approved' : body?.status === 'rejected' ? 'rejected' : null
  if (!status) return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })

  // Fetch dari album_class_requests
  const { data: row, error: fetchErr } = await client
    .from('album_class_requests')
    .select('id, class_id, user_id, student_name, email')
    .eq('id', requestId)
    .eq('class_id', classId)
    .single()

  if (fetchErr || !row) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (status === 'approved') {
    // Pindahkan ke album_class_access sebagai approved
    const rowData = row as { id: string; class_id: string; user_id: string; student_name: string; email?: string | null }
    const { data: created, error: insertErr } = await client
      .from('album_class_access')
      .insert({
        album_id: albumId,
        class_id: rowData.class_id,
        user_id: rowData.user_id,
        student_name: rowData.student_name,
        email: rowData.email || null,
        status: 'approved',
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // Hapus dari album_class_requests
    await client.from('album_class_requests').delete().eq('id', requestId)

    return NextResponse.json(created)
  } else {
    // Reject: update status di album_class_requests
    const { data: updated, error } = await client
      .from('album_class_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(updated)
  }
}
