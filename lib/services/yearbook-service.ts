
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'
import { getCache, setCache, delCache, key } from '@/lib/redis'

/**
 * Fetch Album Overview (incl. classes & counts) with Redis Cache.
 * Used by GET /api/albums/[id] and SSR page.
 */
export async function getAlbumOverview(albumId: string, userId?: string) {
    // 2. Fetch DB
    const admin = createAdminClient()
    const client = admin || await createClient()

    // Fetch Album Meta
    const selectWithPosition = 'id, name, type, status, cover_image_url, cover_image_position, cover_video_url, description, user_id, created_at'
    const selectWithoutPosition = 'id, name, type, status, cover_image_url, description, user_id, created_at'

    const { data: albumWithPosition, error: errWithPosition } = await client
        .from('albums')
        .select(selectWithPosition)
        .eq('id', albumId)
        .single()

    let album: Record<string, unknown> | null = null

    if (errWithPosition && !albumWithPosition) {
        // Fallback for older schema if column missing (safe bet)
        const { data: albumFallback } = await client
            .from('albums')
            .select(selectWithoutPosition)
            .eq('id', albumId)
            .single()
        album = albumFallback as Record<string, unknown> | null
        if (album) (album as any).cover_image_position = null
    } else {
        album = albumWithPosition as Record<string, unknown> | null
    }

    if (!album) return null // Not found

    // Fetch Classes & Counts
    let classesWithCount: any[] = []
    if (album.type === 'yearbook') {
        const { data: classes } = await client
            .from('album_classes')
            .select('id, name, sort_order')
            .eq('album_id', albumId)
            .order('sort_order', { ascending: true })

        const classList = (classes ?? []) as { id: string; name: string; sort_order: number }[]
        const studentCounts: Record<string, number> = {}

        const { data: allAccess } = await client
            .from('album_class_access')
            .select('class_id, student_name, status, photos')
            .eq('album_id', albumId)

        if (allAccess) {
            for (const c of classList) {
                const classMembers = allAccess.filter(a => a.class_id === c.id)
                // Logic: Approved OR has photos
                const validMembers = classMembers.filter(a =>
                    a.status === 'approved' || (Array.isArray(a.photos) && a.photos.length > 0)
                )
                // Unique Names
                const uniqueNames = new Set(validMembers.map(m => m.student_name).filter(Boolean))
                studentCounts[c.id] = uniqueNames.size
            }
        }

        classesWithCount = classList.map((c) => ({
            id: c.id,
            name: c.name,
            sort_order: c.sort_order,
            student_count: studentCounts[c.id] ?? 0,
        }))
    }

    const albumData = { ...album, classes: classesWithCount }

    // 3. Permission Checks (if userId provided)
    if (userId) {
        const supabase = await createClient()

        const admin = createAdminClient()
        const client = admin || supabase

        const row = albumData as { id: string; name: string; type: string; status?: string; cover_image_url?: string | null; cover_image_position?: string | null; cover_video_url?: string | null; description?: string | null; user_id: string; classes: any[] }

        const isActualOwner = row.user_id === userId

        // Check admin status via profiles table
        let isAdmin = false
        try {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
            if (profile?.role === 'admin') isAdmin = true
        } catch { }

        const isOwner = isActualOwner || isAdmin
        let isAlbumAdmin = false

        if (!isOwner && !isAdmin) {
            const { data: member } = await client
                .from('album_members')
                .select('role')
                .eq('album_id', albumId)
                .eq('user_id', userId)
                .maybeSingle()

            if (member?.role === 'admin') {
                isAlbumAdmin = true
            } else {
                // Check access (approved member)
                const { data: approved } = await client
                    .from('album_class_access')
                    .select('id, status')
                    .eq('album_id', albumId)
                    .eq('user_id', userId)
                    .eq('status', 'approved')
                    .maybeSingle()

                if (!approved) return null // No Access
            }
        }

        return {
            id: row.id,
            name: row.name,
            type: row.type,
            status: row.status,
            cover_image_url: row.cover_image_url ?? null,
            cover_image_position: row.cover_image_position ?? null,
            cover_video_url: (row as any).cover_video_url ?? null,
            description: row.description ?? null,
            isOwner,
            isAlbumAdmin,
            isGlobalAdmin: isAdmin,
            classes: row.classes || [],
        }
    }

    return albumData
}

/**
 * Fetch All Class Members (for directory) with Redis Cache.
 */
export async function getAlbumAllMembers(albumId: string) {
    const admin = createAdminClient()
    const client = admin || await createClient()

    const { data, error } = await client
        .from('album_class_access')
        .select('class_id, user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
        .eq('album_id', albumId)
        .in('status', ['approved', 'pending'])
        .order('student_name', { ascending: true })

    if (error) {
        console.error('Fetch Members Error', error)
        return []
    }

    const result = data || []
    return result
}

/**
 * Fetch My Access & Requests (No Cache - User Specific & Dynamic)
 */
export async function getMyAccessAndRequests(albumId: string, userId: string) {
    const supabase = await createClient()

    const [accessRes, requestsRes] = await Promise.all([
        supabase.from('album_class_access').select('*').eq('album_id', albumId).eq('user_id', userId),
        supabase.from('album_join_requests').select('*').eq('album_id', albumId).eq('user_id', userId)
    ])

    const accessByClass: Record<string, any> = {}
    accessRes.data?.forEach(item => {
        if (item.class_id) accessByClass[item.class_id] = item
    })

    const requestsByClass: Record<string, any> = {}
    requestsRes.data?.forEach(item => {
        if (item.assigned_class_id) requestsByClass[item.assigned_class_id] = item
    })

    return { access: accessByClass, requests: requestsByClass }
}
