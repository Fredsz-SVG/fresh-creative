import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {

    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const { id: albumId } = request.params as any
    if (!albumId) {
      return reply.code(400).send({ error: 'Album ID required' })
    }
    try {

      const admin = getAdminSupabaseClient()
      const client = admin ?? supabase

      const selectWithPosition = 'id, name, type, status, cover_image_url, cover_image_position, cover_video_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price, pricing_package_id'
      const selectWithoutPosition = 'id, name, type, status, cover_image_url, description, user_id, created_at, flipbook_mode, payment_status, payment_url, total_estimated_price, pricing_package_id'

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
        return reply.code(404).send({ error: 'Album not found' })
      }

      const row = album as { id: string; name: string; type: string; status?: string; cover_image_url?: string | null; cover_image_position?: string | null; cover_video_url?: string | null; description?: string | null; user_id: string; flipbook_mode?: string | null; payment_status?: string | null; payment_url?: string | null; total_estimated_price?: number | null; pricing_package_id?: string | null }
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
            return reply.code(404).send({ error: 'Album not found' })
          }
          // User has approved join request - allow access
        }
      }

      if (row.type !== 'yearbook') {
        return reply.code(500).send({
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
        return reply.send({ error: classesErr.message })
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
          // Count distinct names
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

      return reply.send({
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
        pricing_package_id: row.pricing_package_id || null,
        classes: classesWithCount,
      })
    } finally {
    }

  })

  server.patch('/', async (request: any, reply: any) => {

    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })

    const admin = getAdminSupabaseClient()
    const client = admin ?? supabase

    const { data: album, error: albumErr } = await client
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()

    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })
    const role = await getRole(supabase, user)
    if ((album as { user_id: string }).user_id !== user.id && role !== 'admin') {
      return reply.code(403).send({ error: 'Only owner can update' })
    }

    const body = (request.body || {})
    const { cover_image_url, description, students_count, flipbook_mode, total_estimated_price } = body as { cover_image_url?: string; description?: string; students_count?: number; flipbook_mode?: string; total_estimated_price?: number }

    const updates: { cover_image_url?: string; description?: string; students_count?: number; flipbook_mode?: string; total_estimated_price?: number } = {}
    if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url
    if (description !== undefined) updates.description = description
    if (students_count !== undefined) updates.students_count = students_count
    if (flipbook_mode !== undefined) updates.flipbook_mode = flipbook_mode
    if (total_estimated_price !== undefined) updates.total_estimated_price = total_estimated_price
    if (Object.keys(updates).length === 0) return reply.code(500).send(album)

    const { data: updated, error } = await client
      .from('albums')
      .update(updates)
      .eq('id', albumId)
      .select()
      .single()

    if (error) return reply.send({ error: error.message })
    return reply.send(updated)

  })

}

export default route
