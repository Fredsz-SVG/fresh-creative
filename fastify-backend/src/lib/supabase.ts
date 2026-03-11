import { createClient } from '@supabase/supabase-js'
import { FastifyRequest } from 'fastify'

/**
 * Supabase client yang meneruskan token auth user dari cookie/header.
 * Untuk operasi yang mengikuti RLS (Row Level Security).
 */
export function getSupabaseClient(req: FastifyRequest) {
    let token: string | undefined

    const cookies = (req as any).cookies || {}
    let rawCookie = cookies['sb-access-token'] // legacy check

    // Check modern @supabase/ssr cookies
    if (!rawCookie && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
            const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
            const authKey = `sb-${ref}-auth-token`
            rawCookie = cookies[authKey]
            if (!rawCookie) {
                // Check chunks
                let chunkStr = ''
                for (let i = 0; i < 5; i++) {
                    if (cookies[`${authKey}.${i}`]) chunkStr += cookies[`${authKey}.${i}`]
                }
                if (chunkStr) rawCookie = chunkStr
            }
        } catch { }
    }

    if (rawCookie) {
        try {
            let str = rawCookie
            if (str.startsWith('base64-')) {
                str = Buffer.from(str.substring(7), 'base64').toString('utf8')
            }
            const parsed = JSON.parse(str)
            if (parsed?.access_token) token = parsed.access_token
            else if (Array.isArray(parsed) && parsed[0]) token = typeof parsed[0] === 'string' ? parsed[0] : (parsed[0] as any).access_token || (parsed as any).access_token
        } catch {
            if (typeof rawCookie === 'string' && rawCookie.startsWith('eyJ')) token = rawCookie
        }
    }

    // Fallback ke Authorization header
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ')
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1]
        }
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: { persistSession: false },
            global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        }
    )
}

/**
 * Supabase client dengan service role key (bypass RLS).
 * Hanya untuk server-side admin operations.
 */
export function getAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing SUPABASE env vars')
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}
