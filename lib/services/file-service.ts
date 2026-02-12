import { createClient } from '@/lib/supabase-server'
import { getCache, setCache, delCache, key } from '@/lib/redis'

export async function getUserFiles(userId: string) {
    // Try Cache
    const cacheKey = key.userFiles(userId)
    const cached = await getCache<any[]>(cacheKey)
    if (cached) return cached

    const supabase = await createClient()

    // Fetch from DB
    const { data: files, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching user files:', error)
        throw new Error(error.message)
    }

    const result = files || []

    // Set Cache (TTL 60s)
    await setCache(cacheKey, result, 60)

    return result
}

export async function invalidateUserFiles(userId: string) {
    if (process.env.REDIS_URL) {
        await delCache(key.userFiles(userId))
    }
}
