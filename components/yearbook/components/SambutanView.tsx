'use client'

import React, { useState } from 'react'
import { Plus, Users, X, ChevronLeft, ChevronRight } from 'lucide-react'
import TeacherCard from '@/components/TeacherCard'

export type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  video_url?: string
  sort_order?: number
  photos?: { id: string; file_url: string; sort_order: number }[]
}

interface SambutanViewProps {
  teachers: Teacher[]
  canManage: boolean
  onAddTeacher: (name: string, title: string) => void
  onUpdateTeacher: (teacherId: string, updates: { name?: string; title?: string; message?: string; video_url?: string }) => void
  onDeleteTeacher: (teacherId: string, teacherName: string) => void
  onUploadPhoto: (teacherId: string) => void
  onUploadVideo: (teacherId: string) => void
  onDeletePhoto: (teacherId: string, photoId: string) => void
}

export default function SambutanView({
  teachers,
  canManage,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onUploadPhoto,
  onUploadVideo,
  onDeletePhoto,
}: SambutanViewProps) {
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [teacherPhotoViewer, setTeacherPhotoViewer] = useState<{ teacher: Teacher; photoIndex: number } | null>(null)
  const [teacherVideoViewer, setTeacherVideoViewer] = useState<{ teacher: Teacher; videoUrl: string } | null>(null)

  // Teacher Photo Viewer Modal
  if (teacherPhotoViewer) {
    const { teacher, photoIndex } = teacherPhotoViewer
    const photos = teacher.photos || []
    const currentPhoto = photos[photoIndex]
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 bg-black/80">
          <button type="button" onClick={() => setTeacherPhotoViewer(null)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white hover:bg-white/10">
            <X className="w-5 h-5" /> Tutup
          </button>
          <span className="text-white font-medium">{teacher.name}</span>
          <span className="text-gray-400 text-sm">{photoIndex + 1}/{photos.length}</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: Math.max(0, photoIndex - 1) })}
              disabled={photoIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          <img
            src={currentPhoto?.file_url}
            alt={teacher.name}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={() => setTeacherPhotoViewer(null)}
          />
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: Math.min(photos.length - 1, photoIndex + 1) })}
              disabled={photoIndex >= photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Teacher Video Viewer Modal
  if (teacherVideoViewer) {
    const { teacher, videoUrl } = teacherVideoViewer
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 bg-black/80">
          <button type="button" onClick={() => setTeacherVideoViewer(null)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white hover:bg-white/10">
            <X className="w-5 h-5" /> Tutup
          </button>
          <span className="text-white font-medium">{teacher.name}</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black p-4">
          <video
            src={videoUrl}
            className="max-w-full max-h-full cursor-pointer"
            autoPlay
            loop
            muted
            playsInline
            onClick={() => setTeacherVideoViewer(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {canManage && (
          !addingTeacher ? (
            <button
              type="button"
              onClick={() => setAddingTeacher(true)}
              className="px-4 py-2 rounded-xl bg-lime-600 text-white hover:bg-lime-500 transition-colors flex items-center justify-center gap-2 text-sm font-medium flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="Nama"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-app text-sm placeholder:text-gray-500 w-48 min-w-0 focus:outline-none focus:border-lime-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (newTeacherName.trim()) {
                      onAddTeacher(newTeacherName.trim(), '')
                      setAddingTeacher(false)
                      setNewTeacherName('')
                    }
                  }
                  if (e.key === 'Escape') {
                    setAddingTeacher(false)
                    setNewTeacherName('')
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTeacherName.trim()) onAddTeacher(newTeacherName.trim(), '')
                  setAddingTeacher(false)
                  setNewTeacherName('')
                }}
                className="px-4 py-2 rounded-lg bg-lime-600 text-white text-sm font-medium hover:bg-lime-500 transition-colors"
              >
                Tambah
              </button>
              <button
                type="button"
                onClick={() => { setAddingTeacher(false); setNewTeacherName('') }}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Batal
              </button>
            </div>
          )
        )}
      </div>

      {teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-60 min-h-[70vh] w-full">
          <Users className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-center text-sm lg:text-base">Belum ada guru ditambahkan.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              isOwner={canManage}
              isFlipped={editingTeacherId === teacher.id}
              onStartEdit={(t) => setEditingTeacherId(t.id)}
              onCancelEdit={() => setEditingTeacherId(null)}
              onSave={(updatedData) => {
                onUpdateTeacher(teacher.id, updatedData)
                setEditingTeacherId(null)
              }}
              onDelete={(teacherId) => onDeleteTeacher(teacherId, teacher.name)}
              onUploadPhoto={(teacherId) => onUploadPhoto(teacherId)}
              onDeletePhoto={onDeletePhoto}
              onUploadVideo={(teacherId) => onUploadVideo(teacherId)}
              onPlayVideo={(videoUrl) => setTeacherVideoViewer({ teacher, videoUrl })}
              onClickPhoto={(_, photoIndex) => setTeacherPhotoViewer({ teacher, photoIndex })}
              savingTeacher={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
