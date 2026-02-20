import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST: Cleanup flipbook assets (database and storage).
 * This endpoint replaces direct client-side RPC/Storage calls for better security and tidiness.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId } = await params
    if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

    const admin = createAdminClient()
    const client = admin ?? supabase

    // 1. Permission Check
    const { data: album, error: albumErr } = await client
        .from('albums')
        .select('id, user_id')
        .eq('id', albumId)
        .single()

    if (albumErr || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

    const role = await getRole(supabase, user)
    const isOwner = album.user_id === user.id || role === 'admin'

    if (!isOwner) {
        // Check album_members for album admin
        const { data: member } = await client
            .from('album_members')
            .select('role')
            .eq('album_id', albumId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!member || member.role !== 'admin') {
            return NextResponse.json({ error: 'Only administrators can clean flipbook' }, { status: 403 })
        }
    }

    try {
        // 2. Clear Database (using RPC)
        const { error: dbError } = await client.rpc('cleanup_manual_flipbook', { target_album_id: albumId })
        if (dbError) throw dbError

        // 3. Clear Storage
        const flipbookPath = `albums/${albumId}/flipbook`
        const subfolders = ['pages', 'hotspots', 'backgrounds']

        for (const sub of subfolders) {
            const subPath = `${flipbookPath}/${sub}`
            const { data: files } = await client.storage.from('album-photos').list(subPath)
            if (files && files.length > 0) {
                const paths = files.map(f => `${subPath}/${f.name}`)
                await client.storage.from('album-photos').remove(paths)
            }
        }

        // Cleanup legacy hotspots
        const legacyPath = `albums/${albumId}/hotspots`
        const { data: legacyFiles } = await client.storage.from('album-photos').list(legacyPath)
        if (legacyFiles && legacyFiles.length > 0) {
            const paths = legacyFiles.map(f => `${legacyPath}/${f.name}`)
            await client.storage.from('album-photos').remove(paths)
        }

        return NextResponse.json({ message: 'Flipbook assets cleaned successfully' })
    } catch (error: any) {
        console.error('Flipbook cleanup error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * GET: Fetch manual pages and hotspots for an album.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { id: albumId } = await params

    const { data: pages, error } = await supabase
        .from('manual_flipbook_pages')
        .select('*, flipbook_video_hotspots(*)')
        .eq('album_id', albumId)
        .order('page_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(pages)
}
