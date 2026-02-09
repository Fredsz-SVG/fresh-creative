import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: files, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(files)
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData().catch(() => null)
    if (!formData) return NextResponse.json({ error: 'FormData required' }, { status: 400 })

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const fileName = file.name
    const fileType = file.type
    const fileSize = file.size

    // Upload to Storage
    // Format: user_id/timestamp-filename
    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `${user.id}/${timestamp}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('user_files')
        .upload(path, arrayBuffer, {
            contentType: fileType,
            upsert: false
        })

    if (uploadErr) {
        return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('user_files').getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    // Insert into DB
    const { data: asset, error: dbErr } = await supabase
        .from('user_assets')
        .insert({
            user_id: user.id,
            file_url: fileUrl,
            file_name: fileName,
            file_type: fileType,
            size_bytes: fileSize
        })
        .select()
        .single()

    if (dbErr) {
        // Cleanup storage if DB fails? 
        // For now, just error out.
        return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json(asset)
}
