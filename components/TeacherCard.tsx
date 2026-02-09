'use client'

import { useState, useEffect } from 'react'
import { Edit3, Trash2, ImagePlus, Video, Play, Briefcase, MessageSquare } from 'lucide-react'

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
    <div className="relative h-full min-h-[620px]" style={{ perspective: '1000px' }}>
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
          className="relative w-full h-full min-h-[520px] backface-hidden rounded-xl border border-white/10 bg-[#0a0a0b] flex flex-col items-stretch text-left shadow-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Photo section */}
          {(teacher.photos && teacher.photos.length > 0 || teacher.photo_url) && (
            <div className="relative aspect-square overflow-hidden bg-white/5 flex-shrink-0">
              <img
                src={teacher.photos && teacher.photos.length > 0 ? teacher.photos[0].file_url : teacher.photo_url}
                alt={teacher.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onClickPhoto && onClickPhoto(teacher, 0)}
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
                  <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                </button>
              )}
            </div>
          )}

          {/* Profile info section */}
          <div className="flex flex-col flex-1 p-3 lg:p-4">
            {/* Name & Title Group */}
            <div className="mb-1">
              <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                {teacher.name}
              </h3>
              {teacher.title && (
                <p className="text-gray-400 text-sm line-clamp-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {teacher.title}
                </p>
              )}
            </div>

            {/* Details Group */}
            <div className="space-y-0 lg:space-y-1 text-sm text-gray-300 leading-tight">
              {teacher.message && (
                <div className="flex gap-1.5 pt-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <p
                    className="italic text-gray-400 overflow-hidden leading-tight flex-1"
                    style={{ display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }}
                  >
                    "{teacher.message}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - Bottom of front card */}
          {isOwner && (
            <div className="px-3 pt-0 pb-6 mt-auto">
              <div className="flex gap-2 h-8">
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
                    if (confirm(`Hapus ${teacher.name}?`)) {
                      onDelete(teacher.id)
                    }
                  }}
                  className="w-8 text-xs rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 transition-colors flex items-center justify-center"
                  title="Hapus guru"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
          className="flex flex-col rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden p-4"
        >
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-app font-medium text-xs mb-2 flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Edit Profil Guru
            </h3>
            <div className="space-y-1.5">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama Guru"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Jabatan (cth: Guru Matematika, Kepala Sekolah)"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />
              
              {/* Foto Preview & Upload */}
              <div className="space-y-1">
                {teacher.photos && teacher.photos.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {teacher.photos.map((photo, idx) => (
                      <div key={photo.id} className="relative w-16 h-16 rounded overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 group">
                        <img 
                          src={photo.file_url} 
                          alt={`${teacher.name} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus foto ${idx + 1}?`)) {
                              onDeletePhoto(teacher.id, photo.id)
                            }
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title={`Hapus foto ${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onUploadPhoto(teacher.id)}
                  className="w-full px-2 py-1.5 rounded text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <ImagePlus className="w-3 h-3" />
                  {teacher.photos && teacher.photos.length > 0 ? 'Tambah Foto' : 'Upload Foto'}
                </button>
              </div>

              {/* Video URL Input */}
              <input
                type="url"
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                placeholder="URL Video (YouTube, dll)"
                className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
              />
              
              {/* Upload Video Button */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onUploadVideo(teacher.id)}
                  className="flex-1 px-2 py-1.5 rounded text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Video className="w-3 h-3" />
                  Upload Video
                </button>
                {teacher.video_url && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Hapus video?')) {
                        setEditVideoUrl('')
                      }
                    }}
                    className="px-2 py-1.5 rounded text-[10px] bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                    title="Hapus Video"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Message Textarea */}
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Pesan atau sambutan (maks 500 karakter)"
                maxLength={500}
                rows={3}
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
              className="flex-1 px-2 py-1 rounded text-[10px] bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
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
