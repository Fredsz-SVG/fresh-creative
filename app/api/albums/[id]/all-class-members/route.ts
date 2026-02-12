import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCache, setCache, key } from '@/lib/redis'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** 
 * GET /api/albums/[id]/all-class-members
 * Fetches ALL approved class members for the entire album, grouped by class_id implicitly.
 * Supports filtering pending members based on user role.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id: albumId } = await params
        const admin = createAdminClient()
        const client = admin || supabase

        // 1. Check Global/Owner Permissions
        const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
        if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

        let globalRole = 'user'
        try { globalRole = await getRole(supabase, user) } catch { }

        const isGlobalAdmin = globalRole === 'admin'
        const isOwner = album.user_id === user.id || isGlobalAdmin

        // 2. Check Album Member Role
        const { data: member } = await client
            .from('album_members')
            .select('role')
            .eq('album_id', albumId)
            .eq('user_id', user.id)
            .maybeSingle()

        const isAlbumAdmin = member?.role === 'admin'

        // 3. Determine visibility level
        // Can view if: Owner OR Album Member OR Student in ANY approved class
        let canView = isOwner || !!member

        if (!canView) {
            // Check if student
            const { data: student } = await client
                .from('album_class_access')
                .select('id')
                .eq('album_id', albumId)
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .maybeSingle()
            if (student) canView = true
        }

        if (!canView) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const canSeePending = isOwner || isAlbumAdmin

        // 4. Try Cache for Raw Data
        const cacheKey = key.albumAllClassMembers(albumId)
        let allMembers = await getCache<any[]>(cacheKey)

        if (!allMembers) {
            // Fetch from DB
            const { data, error } = await client
                .from('album_class_access')
                .select('class_id, user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
                .eq('album_id', albumId)
                .in('status', ['approved', 'pending'])
                .order('student_name', { ascending: true })

            if (error) throw error
            allMembers = data || []
            await setCache(cacheKey, allMembers, 60)
        }

        // 5. Filter and Map
        const result = (allMembers || [])
            .filter((r: any) => canSeePending || r.status === 'approved')
            .map((r: any) => ({
                class_id: r.class_id,
                user_id: r.user_id,
                student_name: r.student_name,
                email: r.email,
                date_of_birth: r.date_of_birth,
                instagram: r.instagram,
                message: r.message,
                video_url: r.video_url,
                photos: r.photos || [],
                status: r.status,
                is_me: r.user_id === user.id
            }))

        return NextResponse.json(result)

    } catch (err: any) {
        console.error('Error fetching all class members:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
