'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PreviewView from '@/components/yearbook/components/PreviewView'

export default function YearbookPreviewClient({ initialAlbum, initialMembers, initialTeachers, initialFirstPhotos }: any) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isEmbedded = searchParams?.get('embedded') === 'true'
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
            hideCloseButton={isEmbedded}
            onClose={() => {
                if (isEmbedded) {
                    window.parent.postMessage('CLOSE_YEARBOOK_PREVIEW', '*')
                    return
                }
                // Go back to previous page if there's history, otherwise go home
                if (window.history.length > 1) {
                    router.back()
                } else {
                    window.location.href = '/'
                }
            }}
        />
    )
}
