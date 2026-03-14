/**
 * Returns the base URL for the Fastify API backend.
 * In production, this should point to your Render deployment URL.
 * In development, it points to 127.0.0.1:8000.
 */
export function getApiUrl(): string {
    let url = '';
    if (typeof window !== 'undefined') {
        // Client-side: use localhost so cookies are sent correctly
        url = process.env.NEXT_PUBLIC_API_URL?.replace('127.0.0.1', 'localhost') || 'http://localhost:8000'
    } else {
        // Server-side: use 127.0.0.1 to avoid Node.js IPv6 resolution issues
        url = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    }
    // Remove trailing slash if present to avoid double slashes in concatenated paths
    return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Helper to build a full API URL from a path.
 * Usage: apiUrl('/api/albums') => 'http://127.0.0.1:8000/api/albums'
 */
export function apiUrl(path: string): string {
    const base = getApiUrl()
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${cleanPath}`
}
