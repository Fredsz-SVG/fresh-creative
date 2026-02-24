import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'
import { logApiTiming } from '@/lib/api-timing'

export const dynamic = 'force-dynamic'

/** GET: Fetch single album by id (owner, member, or admin). Pakai admin client agar tidak terhalang RLS. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = performance.now()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId } = await params
  if (!albumId) {
    return NextResponse.json({ error: 'Album ID required' }, { status: 400 })
  }
  try {

    const admin = createAdminClient()
    const client = admin ?? supabase

    const selectWithPosition = 'id, name, type, status, cover_image_url, cover_image_position, cover_video_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price'
    const selectWithoutPosition = 'id, name, type, status, cover_image_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price'

    const [albumRes, role] = await Promise.all([
      client.from('albums').select(selectWithPosition).eq('id', albumId).single(),
      getRole(supabase, user)
    ])

    let album: Record<string, unknown> | null = (albumRes.data as Record<string, unknown> | null) ?? null
    let albumErr: { message: string } | null = albumRes.error

    if (albumErr && album == null) {
      const fallback = await client.from('albums').select(selectWithoutPosition).eq('id', albumId).single()
      album = fallback.data as Record<string, unknown> | null
      albumErr = fallback.error
      if (album) (album as Record<string, unknown>).cover_image_position = null
    }

    if (albumErr || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    const row = album as { id: string; name: string; type: string; status?: string; cover_image_url?: string | null; cover_image_position?: string | null; cover_video_url?: string | null; description?: string | null; user_id: string; flipbook_mode?: string | null; payment_status?: string | null; payment_url?: string | null; total_estimated_price?: number | null }
    const isActualOwner = row.user_id === user.id
    const isAdmin = role === 'admin'
    const isOwner = isActualOwner || isAdmin

    let isAlbumAdmin = false

    if (!isOwner && !isAdmin) {
      // Check if user is an album member
      const { data: member } = await (admin ?? supabase)
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (member) {
        if ((member as { role?: string }).role === 'admin') {
          isAlbumAdmin = true
        }
      } else {
        // Check if user has approved class access (approved join requests are moved to album_class_access)
        const { data: approvedClassAccess } = await (admin ?? supabase)
          .from('album_class_access')
          .select('id, status')
          .eq('album_id', albumId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle()

        if (!approvedClassAccess) {
          return NextResponse.json({ error: 'Album not found' }, { status: 404 })
        }
        // User has approved join request - allow access
      }
    }

    if (row.type !== 'yearbook') {
      return NextResponse.json({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status,
        cover_image_url: row.cover_image_url ?? null,
        cover_image_position: row.cover_image_position ?? null,
        cover_video_url: row.cover_video_url ?? null,
        description: row.description ?? null,
        isOwner,
        classes: [],
      })
    }

    const { data: classes, error: classesErr } = await client
      .from('album_classes')
      .select('id, name, sort_order, batch_photo_url')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true })

    if (classesErr) {
      return NextResponse.json({ error: classesErr.message }, { status: 500 })
    }

    const classList = (classes ?? []) as { id: string; name: string; sort_order: number; batch_photo_url?: string }[]
    const studentCounts: Record<string, number> = {}

    // Count by class: minimal columns for grouping and distinct name count
    const { data: allAccess } = await client
      .from('album_class_access')
      .select('class_id, status, photos, student_name')
      .eq('album_id', albumId)

    if (allAccess) {
      for (const c of classList) {
        const classMembers = allAccess.filter(a => a.class_id === c.id)
        const validMembers = classMembers.filter(a =>
          a.status === 'approved' || (Array.isArray(a.photos) && a.photos.length > 0)
        )
        // Count distinct names (though unique constraint usually enforces one name per user per class, name is what matters)
        const uniqueNames = new Set(validMembers.map(m => m.student_name).filter(Boolean))
        studentCounts[c.id] = uniqueNames.size
      }
    }

    const classesWithCount = classList.map((c) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order,
      student_count: studentCounts[c.id] ?? 0,
      batch_photo_url: c.batch_photo_url
    }))

    return NextResponse.json({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      cover_image_url: row.cover_image_url ?? null,
      cover_image_position: row.cover_image_position ?? null,
      cover_video_url: row.cover_video_url ?? null,
      description: row.description ?? null,
      flipbook_mode: row.flipbook_mode || 'manual',
      isOwner,
      isAlbumAdmin,
      isGlobalAdmin: isAdmin,
      payment_status: row.payment_status || 'unpaid',
      payment_url: row.payment_url || null,
      total_estimated_price: row.total_estimated_price || 0,
      classes: classesWithCount,
    })
  } finally {
    logApiTiming('GET', `/api/albums/${albumId}`, start)
  }
}

/** PATCH: Update album (cover, description). Owner only. */
export async function PATCH(
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
    return NextResponse.json({ error: 'Only owner can update' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { cover_image_url, description, students_count, flipbook_mode } = body as { cover_image_url?: string; description?: string; students_count?: number; flipbook_mode?: string }

  const updates: { cover_image_url?: string; description?: string; students_count?: number; flipbook_mode?: string } = {}
  if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url
  if (description !== undefined) updates.description = description
  if (students_count !== undefined) updates.students_count = students_count
  if (flipbook_mode !== undefined) updates.flipbook_mode = flipbook_mode
  if (Object.keys(updates).length === 0) return NextResponse.json(album)

  const { data: updated, error } = await client
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
