import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** DELETE: Hapus kelas (owner only). Cascade hapus siswa & foto. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Only owner can delete class' }, { status: 403 })
  }

  const { data: cls } = await client
    .from('album_classes')
    .select('id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const { error: delErr } = await client.from('album_classes').delete().eq('id', classId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ message: 'Class deleted' })
}

/** PATCH: Update class metadata (name, sort_order). Owner only (owner or admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId, classId } = await params
  if (!albumId || !classId) return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album, error: albumErr } = await client
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  const role = await getRole(supabase, user)
  if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Only owner can update class' }, { status: 403 })
  }

  const { data: cls } = await client
    .from('album_classes')
    .select('id, album_id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .maybeSingle()

  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const sort_order = body?.sort_order !== undefined ? Number(body.sort_order) : undefined

  const updates: { name?: string; sort_order?: number } = {}
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
    // ensure unique name within album
    const { data: existing } = await client
      .from('album_classes')
      .select('id')
      .eq('album_id', albumId)
      .eq('name', name)
      .maybeSingle()
    if (existing && existing.id !== classId) return NextResponse.json({ error: 'Class with this name already exists' }, { status: 400 })
    updates.name = name
  }
  if (sort_order !== undefined && !Number.isNaN(sort_order)) updates.sort_order = sort_order

  if (Object.keys(updates).length === 0) {
    const { data: current } = await client.from('album_classes').select('id, name, sort_order').eq('id', classId).maybeSingle()
    return NextResponse.json(current ?? {})
  }

  const { data: updated, error } = await client
    .from('album_classes')
    .update(updates)
    .eq('id', classId)
    .select('id, name, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
