'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit3, Trash2, ImagePlus, Video, Play, Briefcase, MessageSquare, X, ChevronLeft, ChevronRight } from 'lucide-react'

type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  video_url?: string
  sort_order?: number
  photos?: { id: string; file_url: string; sort_order: number }[]
}

type TeacherCardProps = {
  teacher: Teacher
  isOwner: boolean
  isFlipped: boolean
  onStartEdit: (teacher: Teacher) => void
  onCancelEdit: () => void
  onSave: (updatedData: {
    name: string
    title: string
    message: string
    video_url: string
  }) => void
  onDelete: (teacherId: string) => void
  onUploadPhoto: (teacherId: string) => void
  onDeletePhoto: (teacherId: string, photoId: string) => void
  onUploadVideo: (teacherId: string) => void
  onPlayVideo: (videoUrl: string) => void
  onClickPhoto?: (teacher: Teacher, photoIndex: number) => void
  savingTeacher: boolean
}

export default function TeacherCard({
  teacher,
  isOwner,
  isFlipped,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onUploadPhoto,
  onDeletePhoto,
  onUploadVideo,
  onPlayVideo,
  onClickPhoto,
  savingTeacher
}: TeacherCardProps) {
  // Edit form state
  const [editName, setEditName] = useState(teacher.name)
  const [editTitle, setEditTitle] = useState(teacher.title || '')
  const [editMessage, setEditMessage] = useState(teacher.message || '')
  const [editVideoUrl, setEditVideoUrl] = useState(teacher.video_url || '')
  const [localConfirm, setLocalConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  // Reset form when teacher data changes
  useEffect(() => {
    setEditName(teacher.name)
    setEditTitle(teacher.title || '')
    setEditMessage(teacher.message || '')
    setEditVideoUrl(teacher.video_url || '')
  }, [teacher])

  const handleSave = () => {
    onSave({
      name: editName,
      title: editTitle,
      message: editMessage,
      video_url: editVideoUrl
    })
  }

  return (
    <div className="relative h-full min-h-[380px]" style={{ perspective: '1000px' }}>
      {typeof document !== 'undefined' && createPortal(
        <>
          {localConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setLocalConfirm(null)}>
              <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-red-400 mb-2">{localConfirm.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{localConfirm.message}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setLocalConfirm(null)}
                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      localConfirm.onConfirm()
                      setLocalConfirm(null)
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewerOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4" onClick={() => setViewerOpen(false)}>
              <div className="bg-gray-900 rounded-lg p-3 max-w-[520px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setViewerIndex((i) => (i > 0 ? i - 1 : i))}
                      className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10"
                      title="Prev"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerIndex((i) => (teacher.photos && i < (teacher.photos.length - 1) ? i + 1 : i))}
                      className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setViewerOpen(false)} className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full flex items-center justify-center mb-2">
                  <img
                    src={(teacher.photos && teacher.photos[viewerIndex]) ? teacher.photos[viewerIndex].file_url : teacher.photo_url}
                    alt={`${teacher.name} ${viewerIndex + 1}`}
                    className="max-h-[60vh] object-contain w-full rounded bg-black/5"
                  />
                </div>

                {teacher.photos && teacher.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto mt-1">
                    {teacher.photos.map((p, i) => (
                      <button key={p.id} onClick={() => setViewerIndex(i)} className={`w-12 h-12 rounded overflow-hidden border ${i === viewerIndex ? 'ring-2 ring-lime-500' : 'border-white/10'}`}>
                        <img src={p.file_url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
        className="relative w-full h-full"
      >
        {/* Front Side - Profile View */}
        <div
          className="relative w-full h-full min-h-[340px] backface-hidden rounded-xl border border-white/10 bg-[#0a0a0b] flex flex-col items-stretch text-left shadow-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Photo section */}
          {(teacher.photos && teacher.photos.length > 0 || teacher.photo_url) && (
            <div className="relative aspect-[4/5] overflow-hidden bg-white/5 flex-shrink-0">
              <img
                src={teacher.photos && teacher.photos.length > 0 ? teacher.photos[0].file_url : teacher.photo_url}
                alt={teacher.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => {
                  if (teacher.photos && teacher.photos.length > 0) {
                    setViewerIndex(0)
                    setViewerOpen(true)
                  } else {
                    onClickPhoto && onClickPhoto(teacher, 0)
                  }
                }}
              />
              {/* Video Play Button Overlay */}
              {teacher.video_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayVideo(teacher.video_url!)
                  }}
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center group transition-all hover:scale-110"
                  title="Putar Video"
                >
                  <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                </button>
              )}
            </div>
          )}

          {/* Profile info section */}
          <div className="flex flex-col flex-1 p-2.5">
            {/* Name & Title Group */}
            <div className="mb-0.5">
              <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">
                {teacher.name}
              </h3>
              {teacher.title && (
                <p className="text-gray-400 text-xs line-clamp-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {teacher.title}
                </p>
              )}
            </div>

            {/* Details Group */}
            <div className="space-y-0 text-xs text-gray-300 leading-tight">
              {teacher.message && (
                <div className="flex gap-1 pt-1">
                  <MessageSquare className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
                  <p
                    className="italic text-gray-400 overflow-hidden leading-tight flex-1"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                  >
                    "{teacher.message}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - Bottom of front card */}
          {isOwner && (
            <div className="px-2.5 pt-0 pb-3 mt-auto">
              <div className="flex gap-1.5 h-7">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEdit(teacher)
                  }}
                  className="flex-1 text-xs font-medium rounded-lg bg-lime-900/40 text-lime-400 hover:bg-lime-900/60 border border-lime-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalConfirm({
                      title: 'Hapus Guru',
                      message: `Apakah kamu yakin ingin menghapus "${teacher.name}" dari daftar?`,
                      onConfirm: () => onDelete(teacher.id)
                    })
                  }}
                  className="flex-1 text-xs font-medium rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                  title="Hapus guru"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Side - Edit Form */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          className="flex flex-col rounded-xl border border-white/10 bg-[#0a0a0b] overflow-hidden p-3"
        >
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:[display:none]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <h3 className="text-app font-medium text-[10px] mb-2 flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Edit Profil
            </h3>
            <div className="space-y-1.5">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Jabatan"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />

              {/* Photo Preview & Upload */}
              {teacher.photos && teacher.photos.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {teacher.photos.map((photo, idx) => (
                    <div key={photo.id} className="relative w-12 h-12 rounded overflow-hidden bg-white/5 border border-white/10 group">
                      <img
                        src={photo.file_url}
                        alt={`${teacher.name} ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setViewerIndex(idx)
                          setViewerOpen(true)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLocalConfirm({
                            title: 'Hapus Foto',
                            message: `Yakin ingin menghapus foto ${idx + 1}?`,
                            onConfirm: () => onDeletePhoto(teacher.id, photo.id)
                          })
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Media management */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onUploadPhoto(teacher.id)}
                  disabled={(teacher.photos?.length ?? 0) >= 4}
                  className="flex-1 px-1.5 py-1 rounded text-[9px] bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="w-2.5 h-2.5" /> Foto (maks. 10MB)
                </button>
                <button
                  type="button"
                  onClick={() => onUploadVideo(teacher.id)}
                  className="flex-1 px-1.5 py-1 rounded text-[9px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Video className="w-2.5 h-2.5" /> Video (maks. 20MB)
                </button>
              </div>

              {/* Video URL Input */}
              <input
                type="url"
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                placeholder="Link Video (YouTube)"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />

              {/* Message Textarea */}
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Pesan / Kesan"
                rows={2}
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app resize-none"
              />
            </div>
          </div>

          {/* Save & Cancel buttons */}
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={savingTeacher}
              className="flex-[2] px-2 py-1 rounded text-[10px] bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
            >
              {savingTeacher ? 'Simpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 px-2 py-1 rounded text-[10px] border border-white/10 text-app font-medium hover:bg-white/5"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
