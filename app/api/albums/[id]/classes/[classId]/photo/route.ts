
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/albums/[id]/classes/[classId]/photo - Upload class batch photo
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: albumId, classId } = await params

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is global admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        const isGlobalAdmin = userData?.role === 'admin'

        if (!isGlobalAdmin) {
            // Verify user is album owner or album admin
            const { data: album, error: albumError } = await supabase
                .from('albums')
                .select('user_id')
                .eq('id', albumId)
                .maybeSingle()

            if (albumError || !album) {
                return NextResponse.json({ error: 'Album not found' }, { status: 404 })
            }

            const isOwner = album.user_id === user.id

            if (!isOwner) {
                const { data: member } = await supabase
                    .from('album_members')
                    .select('role')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!member || !['admin', 'owner'].includes(member.role)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }
        }

        // Verify class exists
        const { data: classObj, error: classError } = await supabase
            .from('album_classes')
            .select('batch_photo_url')
            .eq('id', classId)
            .eq('album_id', albumId)
            .maybeSingle()

        if (classError || !classObj) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 })
        }

        // Get file from form data
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Foto maksimal 10MB' }, { status: 413 })
        }

        const bucket = 'album-photos'

        // Delete old photo if exists
        if (classObj.batch_photo_url) {
            try {
                const urlParts = classObj.batch_photo_url.split('/')
                const oldFileName = urlParts[urlParts.length - 1]

                await supabase.storage
                    .from(bucket)
                    .remove([`classes/${classId}/${oldFileName}`])
            } catch (error) {
                console.error('Error deleting old photo:', error)
                // Continue with upload even if old photo deletion fails
            }
        }

        // Upload new photo
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `classes/${classId}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading photo:', uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        // Update class with new photo URL
        const { data: updatedClass, error: updateError } = await supabase
            .from('album_classes')
            .update({ batch_photo_url: publicUrl })
            .eq('id', classId)
            .eq('album_id', albumId)
            .select('id, name, sort_order, batch_photo_url')
            .single()

        if (updateError) {
            console.error('Error updating class photo URL:', updateError)
            // Try to delete uploaded file
            await supabase.storage.from(bucket).remove([filePath])
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json(updatedClass)
    } catch (error: any) {
        console.error('Error in POST /api/albums/[id]/classes/[classId]/photo:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/albums/[id]/classes/[classId]/photo - Delete class batch photo
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; classId: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: albumId, classId } = await params

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is global admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        const isGlobalAdmin = userData?.role === 'admin'

        if (!isGlobalAdmin) {
            // Verify user is album owner or album admin
            const { data: album, error: albumError } = await supabase
                .from('albums')
                .select('user_id')
                .eq('id', albumId)
                .maybeSingle()

            if (albumError || !album) {
                return NextResponse.json({ error: 'Album not found' }, { status: 404 })
            }

            const isOwner = album.user_id === user.id

            if (!isOwner) {
                const { data: member } = await supabase
                    .from('album_members')
                    .select('role')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!member || !['admin', 'owner'].includes(member.role)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }
        }

        // Get class info
        const { data: classObj, error: classError } = await supabase
            .from('album_classes')
            .select('batch_photo_url')
            .eq('id', classId)
            .eq('album_id', albumId)
            .maybeSingle()

        if (classError || !classObj) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 })
        }

        if (!classObj.batch_photo_url) {
            return NextResponse.json({ error: 'No photo to delete' }, { status: 400 })
        }

        // Delete photo from storage
        try {
            const urlParts = classObj.batch_photo_url.split('/')
            const fileName = urlParts[urlParts.length - 1]
            const bucket = 'album-photos'

            const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([`classes/${classId}/${fileName}`])

            if (storageError) {
                console.error('Error deleting photo from storage:', storageError)
                // Continue with database update even if storage deletion fails
            }
        } catch (error) {
            console.error('Error deleting photo:', error)
        }

        // Update class to remove photo URL
        const { error: updateError } = await supabase
            .from('album_classes')
            .update({ batch_photo_url: null })
            .eq('id', classId)
            .eq('album_id', albumId)

        if (updateError) {
            console.error('Error updating class:', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in DELETE /api/albums/[id]/classes/[classId]/photo:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
