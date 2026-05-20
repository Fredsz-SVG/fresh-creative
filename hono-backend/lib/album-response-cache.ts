/**
 * In-memory cache untuk endpoint album (per-isolate Worker).
 * Semua mutasi album harus memanggil invalidateAlbumCaches(albumId) agar refresh tidak menampilkan data lama.
 */

// ── Album public (GET /api/albums/:id/public) ───────────────────────────────
export type AlbumPublicPayload = {
  id: string
  name: string
  description: string | null
  students_count: number | null
  classes: { id: string; name: string; sort_order: number }[]
}
type AlbumPublicCacheEntry = { value: AlbumPublicPayload; expiresAt: number; etag: string }
export const albumPublicCache = new Map<string, AlbumPublicCacheEntry>()
export const ALBUM_PUBLIC_TTL_MS = 2 * 60 * 1000

// ── Flipbook public (GET /api/albums/:id/flipbook/public) ───────────────────
export type FlipbookPublicCacheEntry = {
  value: Record<string, unknown>
  expiresAt: number
  etag: string
}
export const flipbookPublicCache = new Map<string, FlipbookPublicCacheEntry>()
export const FLIPBOOK_PUBLIC_TTL_MS = 2 * 60 * 1000

// ── Classes list (GET /api/albums/:id/classes) ──────────────────────────────
export type ClassCacheEntry = { value: Record<string, unknown>[]; expiresAt: number }
export const classesCache = new Map<string, ClassCacheEntry>()
export const CLASSES_TTL_MS = 30_000

// ── All class members (GET /api/albums/:id/all-class-members) ───────────────
export type AllMembersCacheEntry = { value: Record<string, unknown>[]; expiresAt: number }
export const allMembersCache = new Map<string, AllMembersCacheEntry>()
export const ALL_MEMBERS_TTL_MS = 30_000

// ── Join stats (GET /api/albums/:id/join-stats) ─────────────────────────────
export type JoinStatsPayload = Record<string, unknown>
export type JoinStatsCacheEntry = { value: JoinStatsPayload; expiresAt: number }
export const joinStatsCache = new Map<string, JoinStatsCacheEntry>()
export const JOIN_STATS_TTL_MS = 30_000

// ── Check user (GET /api/albums/:id/check-user) ─────────────────────────────
export type CheckUserCacheEntry = { value: Record<string, unknown>; expiresAt: number }
export const checkUserCache = new Map<string, CheckUserCacheEntry>()
export const CHECK_USER_TTL_MS = 30_000

// ── Check album name (GET /api/albums/check-name) ───────────────────────────
export type AlbumCheckRow = {
  id: string
  name: string | null
  pic_name: string | null
  wa_e164: string | null
}
let checkNameCache: AlbumCheckRow[] | null = null
let checkNameCacheExp = 0
export const CHECK_NAME_TTL_MS = 5 * 60 * 1000

export function getCheckNameCache(): { data: AlbumCheckRow[] | null; expiresAt: number } {
  return { data: checkNameCache, expiresAt: checkNameCacheExp }
}

export function setCheckNameCache(rows: AlbumCheckRow[], expiresAt: number): void {
  checkNameCache = rows
  checkNameCacheExp = expiresAt
}

export function invalidateCheckNameCache(): void {
  checkNameCache = null
  checkNameCacheExp = 0
}

/** Hapus semua cache terkait satu album setelah POST/PATCH/DELETE. */
export function invalidateAlbumCaches(albumId: string, opts?: { userId?: string }): void {
  if (!albumId) return
  albumPublicCache.delete(albumId)
  flipbookPublicCache.delete(albumId)
  classesCache.delete(albumId)
  allMembersCache.delete(albumId)
  joinStatsCache.delete(albumId)
  if (opts?.userId) {
    checkUserCache.delete(`${albumId}:${opts.userId}`)
  } else {
    for (const key of checkUserCache.keys()) {
      if (key.startsWith(`${albumId}:`)) checkUserCache.delete(key)
    }
  }
}
