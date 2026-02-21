'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit3, Trash2, ImagePlus, Video, Play, X, ChevronLeft, ChevronRight } from 'lucide-react'

type Member = {
  user_id: string
  student_name: string
  email?: string | null
  date_of_birth?: string | null
  instagram?: string | null
  message?: string | null
  video_url?: string | null
  photos?: string[]
  is_me?: boolean
}

type MemberCardProps = {
  member: Member
  firstPhoto?: string | null
  classId?: string
  canManage?: boolean
  hasApprovedAccess?: boolean
  isFlipped?: boolean
  onStartEdit?: (m: Member) => void
  onCancelEdit?: () => void
  onSave?: (updatedData: {
    student_name: string
    email: string
    date_of_birth: string
    instagram: string
    message: string
    video_url: string
  }) => void
  onDeleteClick?: () => void
  onUploadPhoto?: (classId?: string, studentName?: string) => void
  onDeletePhoto?: (photoId: string, classId?: string, studentName?: string) => void
  onUploadVideo?: (classId?: string, studentName?: string) => void
  onPlayVideo?: (videoUrl: string) => void
  onOpenGallery?: (classId?: string, studentName?: string) => void
  saving?: boolean
  editPhotos?: { id: string; file_url: string }[]
}

export default function MemberCard({
  member,
  firstPhoto,
  classId,
  canManage,
  hasApprovedAccess,
  isFlipped = false,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDeleteClick,
  onUploadPhoto,
  onDeletePhoto,
  onUploadVideo,
  onPlayVideo,
  onOpenGallery,
  saving = false,
  editPhotos
}: MemberCardProps) {
  const [localConfirm, setLocalConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  // Edit form state
  const [editName, setEditName] = useState(member.student_name)
  const [editEmail, setEditEmail] = useState(member.email || '')
  const [editTtl, setEditTtl] = useState(member.date_of_birth || '')
  const [editInstagram, setEditInstagram] = useState(member.instagram || '')
  const [editMessage, setEditMessage] = useState(member.message || '')
  const [editVideoUrl, setEditVideoUrl] = useState(member.video_url || '')

  // Reset form when member data changes
  useEffect(() => {
    setEditName(member.student_name)
    setEditEmail(member.email || '')
    setEditTtl(member.date_of_birth || '')
    setEditInstagram(member.instagram || '')
    setEditMessage(member.message || '')
    setEditVideoUrl(member.video_url || '')
  }, [member])

  const handleSave = () => {
    onSave?.({
      student_name: editName,
      email: editEmail,
      date_of_birth: editTtl,
      instagram: editInstagram,
      message: editMessage,
      video_url: editVideoUrl
    })
  }

  const photos = (member.photos || []).map((p, i) => ({ id: `${member.student_name}-${i}`, file_url: p, student_name: member.student_name }))
  const displayPreviewPhotos = editPhotos && editPhotos.length > 0 ? editPhotos : photos

  return (
    <>
      {typeof document !== 'undefined' && localConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setLocalConfirm(null)}>
          <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-2">{localConfirm.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{localConfirm.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setLocalConfirm(null)} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium">Batal</button>
              <button onClick={() => { localConfirm.onConfirm(); setLocalConfirm(null) }} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium">Ya, Hapus</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && viewerOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4" onClick={() => setViewerOpen(false)}>
          <div className="bg-gray-900 rounded-lg p-3 max-w-[520px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => setViewerIndex(i => Math.max(0, i - 1))} className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10" title="Prev"><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => setViewerIndex(i => Math.min(i + 1, displayPreviewPhotos.length - 1))} className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10" title="Next"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button type="button" onClick={() => setViewerOpen(false)} className="p-1 rounded bg-white/5 text-gray-300 hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>

            <div className="w-full flex items-center justify-center mb-2">
              <img src={(displayPreviewPhotos[viewerIndex] && displayPreviewPhotos[viewerIndex].file_url) || firstPhoto || ''} alt={`${member.student_name} ${viewerIndex + 1}`} className="max-h-[60vh] object-contain w-full rounded bg-black/5" />
            </div>

            {displayPreviewPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mt-1">
                {displayPreviewPhotos.map((p, i) => (
                  <button key={p.id} onClick={() => setViewerIndex(i)} className={`w-12 h-12 rounded overflow-hidden border ${i === viewerIndex ? 'ring-2 ring-lime-500' : 'border-white/10'}`}>
                    <img src={p.file_url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <div className="relative h-full min-h-[320px]" style={{ perspective: '1000px' }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
          className="relative w-full h-full"
        >
          {/* Front Side */}
          <div className="relative w-full h-full min-h-[280px] backface-hidden rounded-xl border border-white/10 bg-[#0a0a0b] flex flex-col items-stretch text-left shadow-xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
            {(photos.length > 0 || firstPhoto) && (
              <div className="relative aspect-[4/5] overflow-hidden bg-white/5 flex-shrink-0">
                <img src={photos.length > 0 ? photos[0].file_url : firstPhoto || ''} alt={member.student_name} className="w-full h-full object-cover cursor-pointer" onClick={() => {
                  if (photos.length > 0) { setViewerIndex(0); setViewerOpen(true) }
                  else if (onOpenGallery) onOpenGallery(classId, member.student_name)
                }} />

                {member.video_url && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); if (onPlayVideo) onPlayVideo(member.video_url!) }} className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center group transition-all hover:scale-110" title="Putar Video">
                    <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col flex-1 p-2 min-h-0">
              <div className="mb-0.5">
                <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">
                  {member.student_name}
                  {member.is_me ? <span className="font-normal text-lime-400 ml-1 text-xs"> (Anda)</span> : ''}
                </h3>
                {member.email && <p className="text-gray-400 text-xs line-clamp-1">{member.email}</p>}
              </div>

              <div className="space-y-0 text-xs text-gray-300 leading-tight">
                {member.date_of_birth && <p className="line-clamp-1 flex items-center gap-1.5"><span className="truncate">{member.date_of_birth}</span></p>}
                {member.instagram && (
                  <a href={member.instagram.startsWith('http') ? member.instagram : `https://instagram.com/${member.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors line-clamp-1" onClick={(e) => e.stopPropagation()}>
                    <span className="truncate">{member.instagram.startsWith('@') ? member.instagram : '@' + member.instagram}</span>
                  </a>
                )}
                {member.message && <p className="italic text-gray-400 overflow-hidden leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>"{member.message}"</p>}
              </div>
            </div>

            <div className="px-2 pt-0 pb-2 mt-auto">
              <div className="flex gap-1.5 h-7">
                {(canManage || member.is_me || hasApprovedAccess) && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onStartEdit?.(member) }} className="flex-1 text-xs font-medium rounded-lg bg-lime-900/40 text-lime-400 hover:bg-lime-900/60 border border-lime-500/20 transition-colors flex items-center justify-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                )}
                {canManage && (
                  <button type="button" onClick={() => onDeleteClick?.()} className="flex-1 text-xs font-medium rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 transition-colors flex items-center justify-center gap-1.5" title="Hapus anggota"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
                )}
              </div>
            </div>
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
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                />
                <input
                  type="text"
                  value={editTtl}
                  onChange={(e) => setEditTtl(e.target.value)}
                  placeholder="Tempat, Tanggal Lahir"
                  className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                />
                <input
                  type="text"
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  placeholder="Instagram"
                  className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                />

                {/* Photo Preview List */}
                {displayPreviewPhotos.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {displayPreviewPhotos.map((photo, idx) => (
                      <div key={photo.id} className="relative w-12 h-12 rounded overflow-hidden bg-white/5 border border-white/10 group">
                        <img
                          src={photo.file_url}
                          alt={`preview-${idx}`}
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
                              onConfirm: () => onDeletePhoto?.(photo.id, classId, member.student_name)
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
                    onClick={() => onUploadPhoto?.(classId, member.student_name)}
                    disabled={displayPreviewPhotos.length >= 4}
                    className="flex-1 px-1.5 py-1 rounded text-[9px] bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImagePlus className="w-2.5 h-2.5" /> Foto (maks. 10MB)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUploadVideo?.(classId, member.student_name)}
                    className="flex-1 px-1.5 py-1 rounded text-[9px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                  >
                    <Video className="w-2.5 h-2.5" /> Video (maks. 20MB)
                  </button>
                </div>

                <input
                  type="url"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="Link Video (YouTube)"
                  className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                />

                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Pesan / Kesan"
                  rows={2}
                  className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app resize-none"
                />
              </div>
            </div>

            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] px-2 py-1 rounded text-[10px] bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
              >
                {saving ? 'Simpan...' : 'Simpan'}
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
    </>
  )
}
