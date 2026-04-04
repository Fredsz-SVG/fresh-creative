
import { cookies } from 'next/headers'

type Json = Record<string, unknown> | unknown[] | null

function getServerOrigin(): string {
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (explicit) return explicit.replace(/\/$/, '')

    const vercel = process.env.VERCEL_URL?.trim()
    if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

    // Local fallback (dev)
    return 'http://localhost:3001'
}

async function fetchApiJson(path: string, options: { isPublic?: boolean } = {}): Promise<{ ok: boolean; status: number; json: Json }> {
    let cookieHeader: string | undefined
    
    if (!options.isPublic) {
        const cookieStore = await cookies()
        cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join('; ')
    }

    const origin = getServerOrigin()
    const url = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`

    const res = await fetch(url, {
        // Server-side fetch: forward cookies only if NOT a public request.
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: 'no-store',
    })
    const json = (await res.json().catch(() => null)) as Json
    return { ok: res.ok, status: res.status, json }
}

/**
 * Fetch Album Overview (incl. classes & counts) with Redis Cache.
 * Used by GET /api/albums/[id] and SSR page.
 * @param isPublic — jika true, request tanpa cookie (publik). Bukan user id.
 */
export async function getAlbumOverview(albumId: string, isPublic: boolean = false) {
    const { ok, json } = await fetchApiJson(`/api/albums/${encodeURIComponent(albumId)}`, { isPublic })
    if (!ok) return null
    return json as any
}

/**
 * Fetch All Class Members (for directory) with Redis Cache.
 */
export async function getAlbumAllMembers(albumId: string, isPublic: boolean = false) {
    const { ok, json } = await fetchApiJson(`/api/albums/${encodeURIComponent(albumId)}/all-class-members`, { isPublic })
    if (!ok) return []
    return (Array.isArray(json) ? json : []) as any[]
}

/**
 * Sambutan (teachers) disimpan di D1; GET ini tidak memerlukan auth — sama dengan editor yearbook.
 */
export async function getAlbumTeachers(albumId: string, isPublic: boolean = false) {
    const { ok, json } = await fetchApiJson(`/api/albums/${encodeURIComponent(albumId)}/teachers`, { isPublic })
    if (!ok) return []
    return (Array.isArray(json) ? json : []) as any[]
}

/**
 * Fetch My Access & Requests (No Cache - User Specific & Dynamic)
 */
export async function getMyAccessAndRequests(albumId: string, userId: string) {
    // D1 source: Hono endpoint returns already-grouped maps.
    // Note: `userId` retained for backward compatibility, but not needed here.
    const { ok, json } = await fetchApiJson(`/api/albums/${encodeURIComponent(albumId)}/my-access-all`)
    if (!ok || !json || typeof json !== 'object' || Array.isArray(json)) {
        return { access: {}, requests: {} }
    }
    const o = json as { access?: unknown; requests?: unknown }
    return {
        access: (o.access && typeof o.access === 'object' && !Array.isArray(o.access) ? o.access : {}) as any,
        requests: (o.requests && typeof o.requests === 'object' && !Array.isArray(o.requests) ? o.requests : {}) as any,
    }
}
