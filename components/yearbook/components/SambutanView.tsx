'use client'

import React, { useState } from 'react'
import { Plus, Users, X, ChevronLeft, ChevronRight } from 'lucide-react'
import TeacherCard from '@/components/TeacherCard'
import FastImage from '@/components/ui/FastImage'

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
  onUpdateTeacher: (teacherId: string, updates: { name?: string; title?: string; message?: string; video_url?: string; pendingPhotos?: File[]; pendingVideo?: File | null }) => void
  onDeleteTeacher: (teacherId: string, teacherName: string) => void
  onDeletePhoto: (teacherId: string, photoId: string) => void
  onPlayVideo?: (videoUrl: string) => void
}

export default function SambutanView({
  teachers,
  canManage,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onDeletePhoto,
  onPlayVideo,
}: SambutanViewProps) {
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [teacherPhotoViewer, setTeacherPhotoViewer] = useState<{ teacher: Teacher; photoIndex: number } | null>(null)

  // Teacher Photo Viewer Modal
  if (teacherPhotoViewer) {
    const { teacher, photoIndex } = teacherPhotoViewer
    const photos = teacher.photos || []
    const currentPhoto = photos[photoIndex]
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-700 bg-black/80">
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
          <FastImage
            src={currentPhoto?.file_url}
            alt={teacher.name}
            className="max-w-full max-h-full object-contain cursor-pointer"
            priority
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

  return (
    <div className="max-w-5xl mx-auto px-3 pt-0 pb-4 sm:px-3 sm:py-4">
      {canManage && (
        <>
          {/* Add Teacher Modal/Overlay */}
          {addingTeacher && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => { setAddingTeacher(false); setNewTeacherName('') }}
              />
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155] overflow-hidden animate-in zoom-in-95 duration-200 z-[101]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tambah Guru</h3>
                    <button
                      onClick={() => { setAddingTeacher(false); setNewTeacherName('') }}
                      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Nama Lengkap Guru</label>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="Contoh: Bpk. Budi Santoso"
                        className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-600 text-base font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all shadow-[4px_4px_0_0_#f1f5f9] dark:shadow-[4px_4px_0_0_#334155]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTeacherName.trim()) {
                            onAddTeacher(newTeacherName.trim(), '')
                            setAddingTeacher(false)
                            setNewTeacherName('')
                          }
                          if (e.key === 'Escape') {
                            setAddingTeacher(false)
                            setNewTeacherName('')
                          }
                        }}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setAddingTeacher(false); setNewTeacherName('') }}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (newTeacherName.trim()) {
                            onAddTeacher(newTeacherName.trim(), '')
                            setAddingTeacher(false)
                            setNewTeacherName('')
                          }
                        }}
                        disabled={!newTeacherName.trim()}
                        className="flex-[2] py-4 rounded-2xl bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest border-4 border-slate-900 dark:border-slate-600 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                      >
                        Tambah Sekarang
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Button for Adding Teacher */}
          {!addingTeacher && (
            <button
              type="button"
              onClick={() => setAddingTeacher(true)}
              className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 z-[60] flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-amber-400 dark:bg-amber-600 border-2 border-slate-900 dark:border-slate-600 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:scale-90 group"
              title="Tambah Guru"
            >
              <Plus className="w-8 h-8 text-slate-900 dark:text-white transition-transform group-hover:rotate-90" strokeWidth={2.5} />
            </button>
          )}
        </>
      )}

      {teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[50vh] w-full bg-slate-50/50 dark:bg-slate-800/30 rounded-[40px] border-4 border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 rounded-3xl bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#e2e8f0] flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-2">Belum Ada Guru</h3>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-tight">Klik tombol tambah untuk memulai daftar sambutan</p>
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
              onDeletePhoto={onDeletePhoto}
              onPlayVideo={(videoUrl) => onPlayVideo?.(videoUrl)}
              onClickPhoto={(_, photoIndex) => setTeacherPhotoViewer({ teacher, photoIndex })}
              savingTeacher={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
