import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect, notFound } from 'next/navigation'
import YearbookPreviewClient from './YearbookPreviewClient'
import { getAlbumOverview, getAlbumAllMembers } from '@/lib/services/yearbook-service'

// Helper to group members by class
function groupMembers(members: any[]) {
    const grouped: Record<string, any[]> = {}
    members.forEach(m => {
        if (m.class_id) {
            if (!grouped[m.class_id]) grouped[m.class_id] = []
            const { class_id, ...rest } = m
            grouped[m.class_id].push({ ...rest })
        }
    })
    return grouped
}

export default async function PreviewAlbumPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const supabaseAdmin = createAdminClient() || await createClient()

    // For public preview, we only get the basic accessible album data without auth requirement
    const [album, allMembersRaw] = await Promise.all([
        getAlbumOverview(id, undefined), // Fetch as public
        getAlbumAllMembers(id),
    ])

    if (!album) {
        return notFound()
    }

    // Convert raw members array to grouped by class
    const initialMembers = groupMembers(allMembersRaw ?? [])

    // Pre-extract first photos from members for quick access
    const firstPhotoByStudent: Record<string, string> = {}
    if (allMembersRaw) {
        for (const m of allMembersRaw) {
            if (m.student_name && m.photos && Array.isArray(m.photos) && m.photos.length > 0) {
                firstPhotoByStudent[m.student_name] = m.photos[0]
            }
        }
    }

    // Fetch teachers with photos server-side using admin client to bypass RLS for public view
    let teachers = []
    const { data: tData } = await supabaseAdmin
        .from('album_teachers')
        .select('*')
        .eq('album_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (tData && tData.length > 0) {
        const teacherIds = tData.map(t => t.id)
        const { data: photos } = await supabaseAdmin
            .from('album_teacher_photos')
            .select('*')
            .in('teacher_id', teacherIds)
            .order('sort_order', { ascending: true })

        const photosByTeacher: Record<string, any[]> = {}
        if (photos) {
            photos.forEach(photo => {
                if (!photosByTeacher[photo.teacher_id]) photosByTeacher[photo.teacher_id] = []
                photosByTeacher[photo.teacher_id].push(photo)
            })
        }

        teachers = tData.map(t => ({
            ...t,
            photos: photosByTeacher[t.id] || []
        }))
    }

    return (
        <YearbookPreviewClient
            initialAlbum={album as any}
            initialMembers={initialMembers}
            initialTeachers={teachers}
            initialFirstPhotos={firstPhotoByStudent}
        />
    )
}
