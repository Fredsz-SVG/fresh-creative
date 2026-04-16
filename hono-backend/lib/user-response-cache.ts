type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const userMeCache = new Map<string, CacheEntry<Record<string, unknown>>>()
const userBootstrapCache = new Map<string, CacheEntry<Record<string, unknown>>>()
const userNotificationsCache = new Map<string, CacheEntry<Record<string, unknown>[]>>()

function readCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = store.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    store.delete(key)
    return null
  }
  return cached.value
}

function writeCache<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
): void {
  if (ttlMs <= 0) return
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function getUserMeCache(userId: string): Record<string, unknown> | null {
  return readCache(userMeCache, userId)
}

export function setUserMeCache(
  userId: string,
  value: Record<string, unknown>,
  ttlMs: number
): void {
  writeCache(userMeCache, userId, value, ttlMs)
}

export function getUserBootstrapCache(userId: string): Record<string, unknown> | null {
  return readCache(userBootstrapCache, userId)
}

export function setUserBootstrapCache(
  userId: string,
  value: Record<string, unknown>,
  ttlMs: number
): void {
  writeCache(userBootstrapCache, userId, value, ttlMs)
}

export function getUserNotificationsCache(userId: string): Record<string, unknown>[] | null {
  return readCache(userNotificationsCache, userId)
}

export function setUserNotificationsCache(
  userId: string,
  value: Record<string, unknown>[],
  ttlMs: number
): void {
  writeCache(userNotificationsCache, userId, value, ttlMs)
}

export function invalidateUserResponseCaches(userId: string): void {
  userMeCache.delete(userId)
  userBootstrapCache.delete(userId)
  userNotificationsCache.delete(userId)
}
