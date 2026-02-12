import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCache, setCache, key } from '@/lib/redis'

export async function getUserAlbums(userId: string, isAdmin: boolean = false) {
    // 1. Try Cache (User Specific)
    // Admin usually fetches ALL, but if we reuse this for admin dashboard specific to user view?
    // Let's assume this function is for the "Dashboard List" logic.
    // If isAdmin is true (Global Admin), the logic in API was different (fetch ALL).
    // But here we might want "User's Albums" or "All Albums".
    // Let's stick to the User View logic for now, or handle both.

    if (isAdmin) {
        // Admin Logic: Fetch ALL
        // Redis caching for Admin ALL list? 
        // API didn't cache admin view because of filters/pagination usually, but here it's full list.
        // Let's skip cache for admin for now or use specific key if needed.
        const adminClient = createAdminClient()
        if (!adminClient) throw new Error('Admin client not configured')

        const { data: albums, error } = await adminClient
            .from('albums')
            .select(`
          id, name, type, status, created_at, 
          pricing_package_id, 
          pricing_packages(name), 
          school_city, kab_kota, wa_e164, province_id, province_name, pic_name, students_count, source, total_estimated_price
        `)
            .order('created_at', { ascending: false })

        if (error) throw error

        const result = (albums ?? []).map((a: any) => {
            const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
            return {
                ...a,
                pricing_packages: pkg,
                isOwner: false // Admin view
            }
        })
        return result
    }

    // User Logic
    const cacheKey = key.userAlbums(userId)
    const cached = await getCache<any[]>(cacheKey)
    if (cached) return cached

    const supabase = await createClient()

    // User: Fetch OWN albums
    const { data: ownedAlbums, error: ownedErr } = await supabase
        .from('albums')
        .select('*, pricing_packages(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (ownedErr) throw ownedErr

    // Member albums
    const { data: memberRows } = await supabase.from('album_members').select('album_id').eq('user_id', userId)
    const memberAlbumIds = (memberRows ?? []).map((r: { album_id: string }) => r.album_id).filter(Boolean)

    let memberAlbums: any[] = []
    if (memberAlbumIds.length > 0) {
        const { data } = await supabase
            .from('albums')
            .select('*, pricing_packages(name)')
            .in('id', memberAlbumIds)
        memberAlbums = data ?? []
    }

    // Approved class access albums
    const adminClient = createAdminClient()
    let approvedClassAccessAlbums: any[] = []
    if (adminClient) {
        const { data: approvedClassRows } = await adminClient
            .from('album_class_access')
            .select('album_id')
            .eq('user_id', userId)
            .eq('status', 'approved')

        const approvedAlbumIds = (approvedClassRows ?? []).map((r: { album_id: string }) => r.album_id).filter(Boolean)

        if (approvedAlbumIds.length > 0) {
            const { data } = await adminClient
                .from('albums')
                .select('*, pricing_packages(name)')
                .in('id', approvedAlbumIds)
            approvedClassAccessAlbums = data ?? []
        }
    }

    const ownedSet = new Set((ownedAlbums ?? []).map(a => a.id))
    const memberSet = new Set(memberAlbums.map(a => a.id))
    const finalAlbums = [
        ...(ownedAlbums ?? []).map(a => ({ ...a, isOwner: true })),
        ...memberAlbums.filter(a => !ownedSet.has(a.id)).map(a => ({ ...a, isOwner: false })),
        ...approvedClassAccessAlbums.filter(a => !ownedSet.has(a.id) && !memberSet.has(a.id)).map(a => ({ ...a, isOwner: false, status: 'approved' }))
    ]

    // Sort combined
    finalAlbums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Normalize pricing_packages
    const normalized = finalAlbums.map((a: any) => {
        const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
        return { ...a, pricing_packages: pkg }
    })

    // Set Cache
    await setCache(cacheKey, normalized, 60)

    return normalized
}
