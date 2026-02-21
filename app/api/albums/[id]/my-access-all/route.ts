import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { logApiTiming } from '@/lib/api-timing'

export const dynamic = 'force-dynamic'

/** 
 * GET /api/albums/[id]/my-access-all
 * Fetches the current user's access status and join requests for ALL classes in the album.
 * Optimized replacement for looping through classes and fetching individually.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const start = performance.now()
    let albumId: string | null = null
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ access: {}, requests: {} })
        }

        const p = await params
        albumId = p.id
        if (!albumId) {
            return NextResponse.json({ error: 'Album ID required' }, { status: 400 })
        }

        // Parallel fetch: access and requests (only columns needed by frontend)
        const [accessRes, requestsRes] = await Promise.all([
            supabase
                .from('album_class_access')
                .select('id, class_id, album_id, user_id, student_name, email, status, date_of_birth, instagram, message, video_url, photos, created_at')
                .eq('album_id', albumId)
                .eq('user_id', user.id),

            supabase
                .from('album_join_requests')
                .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
                .eq('album_id', albumId)
                .eq('user_id', user.id)
        ])

        if (accessRes.error) {
            console.error('Error fetching access:', accessRes.error)
            throw accessRes.error
        }
        if (requestsRes.error) {
            console.error('Error fetching requests:', requestsRes.error)
            throw requestsRes.error
        }

        // Transform to maps keyed by class_id
        const accessByClass: Record<string, any> = {}
        accessRes.data?.forEach(item => {
            if (item.class_id) {
                accessByClass[item.class_id] = item
            }
        })

        const requestsByClass: Record<string, any[]> = {} // Requests can be multiple? usually one per user per album/class? Schema says unique(album_id, user_id)
        // Actually schema says: CONSTRAINT unique_album_user UNIQUE(album_id, user_id)
        // So a user only has ONE request per album?
        // Let's check schema again. 
        // Step 455: CONSTRAINT unique_album_user UNIQUE(album_id, user_id)
        // Yes, 1 request per album. But it might have `assigned_class_id`.

        // If unique per album, then we just map it. 
        // However, the frontend expects requests mapped by class?
        // Let's verify how my-request works.
        // It queries .eq('assigned_class_id', classId)
        // So if the request is assigned to a class, we map it there.

        const requestsByClassMap: Record<string, any> = {}
        requestsRes.data?.forEach(item => {
            if (item.assigned_class_id) {
                requestsByClassMap[item.assigned_class_id] = item
            }
        })

        return NextResponse.json({
            access: accessByClass,
            requests: requestsByClassMap
        })

    } catch (err: any) {
        console.error('Error in my-access-all:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    } finally {
        if (albumId) logApiTiming('GET', `/api/albums/${albumId}/my-access-all`, start)
    }
}
