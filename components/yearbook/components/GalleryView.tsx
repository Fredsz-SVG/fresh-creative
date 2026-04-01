'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react'
import FastImage from '@/components/ui/FastImage'

type Photo = { id: string; file_url: string; student_name: string; created_at?: string }

interface GalleryViewProps {
    galleryStudent: { classId: string; studentName: string; className: string }
    photos: Photo[]
    photoIndex: number
    setPhotoIndex: (fn: (i: number) => number) => void
    isOwnGallery: boolean
    canUpload: boolean
    onClose: () => void
    onUploadPhoto: (classId: string, studentName: string, className: string, file: File) => void
}

export default function GalleryView({
    galleryStudent,
    photos,
    photoIndex,
    setPhotoIndex,
    isOwnGallery,
    canUpload,
    onClose,
    onUploadPhoto,
}: GalleryViewProps) {
    const galleryUploadInputRef = useRef<HTMLInputElement>(null)
    const hasPhotos = photos.length > 0
    const currentPhoto = hasPhotos ? photos[photoIndex] : null

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-200 bg-white/95 backdrop-blur-sm flex-wrap shadow-sm">
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 font-semibold transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" /> Kembali
                </button>
                <span className="text-gray-800 font-bold truncate max-w-[40%]">{galleryStudent.studentName} — {galleryStudent.className}</span>
                <span className="text-gray-400 text-sm font-semibold">{hasPhotos ? `${photoIndex + 1}/${photos.length}` : '0'}</span>
                {isOwnGallery && (
                    <>
                        <input
                            ref={galleryUploadInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    onUploadPhoto(galleryStudent.classId, galleryStudent.studentName, galleryStudent.className, file)
                                }
                                e.target.value = ''
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => galleryUploadInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-all shadow-sm"
                        >
                            <ImagePlus className="w-4 h-4" /> Upload foto
                        </button>
                    </>
                )}
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
                {hasPhotos ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                            disabled={photoIndex === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <FastImage src={currentPhoto?.file_url} alt="" className="max-w-full max-h-full object-contain" priority />
                        <button
                            type="button"
                            onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
                            disabled={photoIndex >= photos.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </>
                ) : (
                    <div className="text-center text-gray-400 p-6">
                        <p>Belum ada foto untuk siswa ini.</p>
                        {canUpload && (
                            <button
                                type="button"
                                onClick={() => galleryUploadInputRef.current?.click()}
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-all shadow-sm"
                            >
                                <ImagePlus className="w-4 h-4" /> Upload foto
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
