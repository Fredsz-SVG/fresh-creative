import { notFound } from 'next/navigation'
import YearbookPreviewClient from './YearbookPreviewClient'
import { getAlbumOverview, getAlbumAllMembers, getAlbumTeachers } from '@/lib/services/yearbook-service'

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

    const [album, allMembersRaw, teachers] = await Promise.all([
        getAlbumOverview(id, true),
        getAlbumAllMembers(id, true),
        getAlbumTeachers(id, true),
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

    return (
        <YearbookPreviewClient
            initialAlbum={album as any}
            initialMembers={initialMembers}
            initialTeachers={teachers ?? []}
            initialFirstPhotos={firstPhotoByStudent}
        />
    )
}
