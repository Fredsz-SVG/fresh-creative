import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** GET: List classes for album (owner or member). Pakai admin client agar tidak terhalang RLS. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

  const admin = createAdminClient()
  const client = admin ?? supabase

  const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const { data: classes, error } = await client
    .from('album_classes')
    .select('id, name, sort_order, batch_photo_url')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const classList = (classes ?? []) as { id: string; name: string; sort_order: number; batch_photo_url: string | null }[]
  const { data: allAccess } = await client
    .from('album_class_access')
    .select('class_id, photos')
    .eq('album_id', albumId)

  const studentCounts: Record<string, number> = {}
  if (allAccess) {
    for (const r of allAccess) {
      if (Array.isArray(r.photos) && r.photos.length > 0) {
        studentCounts[r.class_id] = (studentCounts[r.class_id] ?? 0) + 1
      }
    }
  }

  const withCount = classList.map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    batch_photo_url: c.batch_photo_url,
    student_count: studentCounts[c.id] ?? 0,
  }))

  return NextResponse.json(withCount)
}

/** POST: Add class (owner only). Pakai admin client agar tidak terhalang RLS. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

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
    return NextResponse.json({ error: 'Only owner can add class' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) return NextResponse.json({ error: 'Class name is required' }, { status: 400 })

  const { data: existing } = await client
    .from('album_classes')
    .select('id')
    .eq('album_id', albumId)
    .eq('name', name)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Class with this name already exists' }, { status: 400 })

  const { count } = await client.from('album_classes').select('id', { count: 'exact', head: true }).eq('album_id', albumId)
  const sort_order = (count ?? 0)

  const { data: created, error } = await client
    .from('album_classes')
    .insert({ album_id: albumId, name, sort_order })
    .select('id, name, sort_order, album_id, created_at')
    .single()

  if (error) {
    const isDuplicate = /duplicate key|unique constraint|album_classes_album_id_name_key/i.test(error.message)
    if (isDuplicate) {
      return NextResponse.json({ error: 'Kelas dengan nama ini sudah ada di album ini' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(created)
}
