'use client'

import React, { useState, useMemo } from 'react'
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

function sortTeachersByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }))
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

  const teachersSorted = useMemo(() => sortTeachersByName(teachers), [teachers])

  // Teacher Photo Viewer — satu layer, gaya sama dengan galeri siswa (dark + thumbnail strip)
  if (teacherPhotoViewer) {
    const { teacher, photoIndex } = teacherPhotoViewer
    const galleryPhotos =
      teacher.photos && teacher.photos.length > 0
        ? teacher.photos
        : teacher.photo_url
          ? [{ id: 'legacy-photo', file_url: teacher.photo_url, sort_order: 0 }]
          : []
    const safeIdx = galleryPhotos.length > 0 ? Math.min(photoIndex, galleryPhotos.length - 1) : 0
    const currentPhoto = galleryPhotos[safeIdx]
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-900 bg-zinc-900/85 px-3 py-2.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setTeacherPhotoViewer(null)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" /> Tutup
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold text-white">{teacher.name}</p>
            {teacher.title && <p className="truncate text-xs text-zinc-400">{teacher.title}</p>}
          </div>
          <span className="shrink-0 tabular-nums text-xs font-semibold text-zinc-400">
            {galleryPhotos.length > 0 ? `${safeIdx + 1} / ${galleryPhotos.length}` : '0'}
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-3 md:px-6">
            {galleryPhotos.length > 0 ? (
              <>
                {galleryPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: Math.max(0, photoIndex - 1) })}
                    disabled={safeIdx === 0}
                    className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2.5 text-white shadow-lg backdrop-blur-sm transition-opacity disabled:opacity-25 md:left-4"
                    aria-label="Foto sebelumnya"
                  >
                    <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
                  </button>
                )}
                <div className="flex max-h-[min(78vh,calc(100dvh-9rem))] w-full max-w-5xl items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setTeacherPhotoViewer(null)}
                    className="relative max-h-full max-w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
                  >
                    <FastImage
                      src={currentPhoto?.file_url}
                      alt={teacher.name}
                      className="max-h-[min(78vh,calc(100dvh-9rem))] w-auto max-w-full object-contain"
                      priority
                      fetchPriority="high"
                      decoding="async"
                    />
                  </button>
                </div>
                {galleryPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setTeacherPhotoViewer({
                        teacher,
                        photoIndex: Math.min(galleryPhotos.length - 1, photoIndex + 1),
                      })
                    }
                    disabled={safeIdx >= galleryPhotos.length - 1}
                    className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2.5 text-white shadow-lg backdrop-blur-sm transition-opacity disabled:opacity-25 md:right-4"
                    aria-label="Foto berikutnya"
                  >
                    <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Belum ada foto.</p>
            )}
          </div>
          {galleryPhotos.length > 1 && (
            <div className="shrink-0 border-t border-slate-900 bg-black/50 px-3 py-3 backdrop-blur-md">
              <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {galleryPhotos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: i })}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 transition-all md:h-16 md:w-16 ${
                      i === safeIdx ? 'ring-violet-400 opacity-100' : 'ring-white/15 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <FastImage src={p.file_url} alt="" className="h-full w-full object-cover" loading={i === safeIdx ? 'eager' : 'lazy'} />
                  </button>
                ))}
              </div>
            </div>
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
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] overflow-hidden animate-in zoom-in-95 duration-200 z-[101]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tambah Profil</h3>
                    <button
                      onClick={() => { setAddingTeacher(false); setNewTeacherName('') }}
                      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Nama Lengkap</label>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="Contoh: Bpk. Budi Santoso"
                        className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-base font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all shadow-[4px_4px_0_0_#f1f5f9] dark:shadow-[4px_4px_0_0_#1e293b]"
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
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
                        className="flex-[2] py-4 rounded-2xl bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
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
              className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 z-[60] flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-amber-400 dark:bg-amber-600 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:scale-90 group"
              title="Tambah Profil"
            >
              <Plus className="w-8 h-8 text-slate-900 dark:text-white transition-transform group-hover:rotate-90" strokeWidth={2.5} />
            </button>
          )}
        </>
      )}

      {teachersSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[45vh] w-full bg-slate-50/50 dark:bg-slate-900/20 rounded-[48px] border-2 border-dashed border-slate-900 dark:border-slate-900 transition-all duration-300 group/empty">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/10 blur-2xl rounded-full scale-150 opacity-0 group-hover/empty:opacity-100 transition-opacity duration-500" />
            <div className="relative w-24 h-24 rounded-[32px] bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] flex items-center justify-center transform group-hover/empty:-rotate-6 transition-transform duration-500">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 group-hover/empty:text-indigo-400 dark:group-hover/empty:text-indigo-500 transition-colors" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] mb-2 text-center px-6">Belum Ada Guru</h3>
          <p className="text-slate-400 dark:text-slate-600 text-[10px] sm:text-xs font-black uppercase tracking-widest text-center max-w-[280px] leading-relaxed px-6">
            Pilih tombol tambah di pojok layar untuk memulai daftar profil guru
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {teachersSorted.map((teacher) => (
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
