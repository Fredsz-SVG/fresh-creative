import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Get the file first to know the URL (for storage deletion)
    const { data: asset, error: fetchErr } = await supabase
        .from('user_assets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (fetchErr || !asset) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from DB
    const { error: dbErr } = await supabase
        .from('user_assets')
        .delete()
        .eq('id', id)

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

    // Delete from Storage
    // Extract path from URL. stored as .../user_files/<path>
    // Example: https://xyz.supabase.co/storage/v1/object/public/user_files/user-id/filename
    try {
        const url = asset.file_url
        const parts = url.split('/user_files/')
        if (parts.length === 2) {
            const storagePath = parts[1]
            await supabase.storage
                .from('user_files')
                .remove([decodeURIComponent(storagePath)])
        }
    } catch (e) {
        console.error('Error removing file from storage:', e)
        // Non-blocking error, DB already deleted
    }

    return NextResponse.json({ success: true })
}
