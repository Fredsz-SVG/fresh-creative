'use client'

import React, { useState } from 'react'
import PreviewView from '@/app/user/portal/album/yearbook/[id]/components/PreviewView'

export default function YearbookPreviewClient({ initialAlbum, initialMembers, initialTeachers, initialFirstPhotos }: any) {
    const [album] = useState<any>(initialAlbum)
    const [membersByClass] = useState<any>(initialMembers)
    const [teachers] = useState<any[]>(initialTeachers || [])
    const [firstPhotos] = useState<Record<string, string>>(initialFirstPhotos || {})

    if (!album) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <p className="text-red-400">Album tidak ditemukan atau belum dipublikasi.</p>
            </div>
        )
    }

    return (
        <PreviewView
            album={album}
            classes={album.classes || []}
            teachers={teachers}
            membersByClass={membersByClass}
            firstPhotoByStudent={firstPhotos}
            onClose={() => {
                // Public view mode, no where else to "close" to right now. 
                // Redirect to login or home if closed.
                window.location.href = '/'
            }}
        />
    )
}
