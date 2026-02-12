import Redis from 'ioredis'

// Global variable to maintain connection in dev HMR
const globalForRedis = global as unknown as { redis: Redis }

export const redis =
    globalForRedis.redis ||
    new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true, // Only connect when used
        retryStrategy: (times) => {
            // Retry up to 3 times, then fail (fallback to DB)
            if (times > 3) return null
            return Math.min(times * 50, 2000)
        },
    })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Key helper
export const key = {
    albumOverview: (albumId: string) => `album:${albumId}:overview`, // Overview data + classes + counts
    albumClasses: (albumId: string) => `album:${albumId}:classes`, // Classes list + counts
    albumMembers: (albumId: string, classId: string) => `album:${albumId}:class:${classId}:members`, // Members data
    albumTeachers: (albumId: string) => `album:${albumId}:teachers`,
    albumAllClassMembers: (albumId: string) => `album:${albumId}:all_members`,
    userAlbums: (userId: string) => `user:${userId}:albums`,
    userFiles: (userId: string) => `user:${userId}:files`,
}

// Helper: Get JSON
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        // If Redis URL is missing or connection failed, return null to fallback
        if (redis.status !== 'ready' && redis.status !== 'connect' && redis.status !== 'connecting') {
            // Try connect if not connecting/connected? Or just rely on lazyConnect.
            // Actually ioredis handles state.
            // But if user hasn't set up redis locally, this might throw or hang.
            // We can check process.env.REDIS_URL presence.
            if (!process.env.REDIS_URL) return null
        }

        const data = await redis.get(key)
        if (!data) return null
        return JSON.parse(data) as T
    } catch (error) {
        console.error('Redis Get Error:', error)
        return null
    }
}

// Helper: Set JSON
export async function setCache(key: string, data: any, ttlSeconds: number = 60) {
    try {
        if (!process.env.REDIS_URL) return
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
    } catch (error) {
        console.error('Redis Set Error:', error)
    }
}

// Helper: Delete
export async function delCache(key: string) {
    try {
        if (!process.env.REDIS_URL) return
        await redis.del(key)
    } catch (error) {
        console.error('Redis Del Error:', error)
    }
}

// Helper: Invalidate Pattern (expensive, use carefully)
export async function invalidatePattern(pattern: string) {
    try {
        if (!process.env.REDIS_URL) return
        const stream = redis.scanStream({ match: pattern })
        stream.on('data', (keys) => {
            if (keys.length) {
                const pipeline = redis.pipeline()
                keys.forEach((key: string) => pipeline.del(key))
                pipeline.exec()
            }
        })
    } catch (error) {
        console.error('Redis Invalidate Error:', error)
    }
}
