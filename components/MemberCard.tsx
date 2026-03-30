'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Edit3, Trash2, ImagePlus, Video, Play, X, ChevronLeft, ChevronRight, Mail, Calendar, Instagram, Quote } from 'lucide-react'

/** Strip surrounding quote characters (straight & curly) so the UI can add its own consistently */
function stripQuotes(s: string): string {
  return s.replace(/^["""\u201C\u201D]+/, '').replace(/["""\u201C\u201D]+$/, '').trim()
}

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
    pendingPhotos?: File[]
    pendingVideo?: File | null
  }) => void
  onDeleteClick?: () => void
  onDeletePhoto?: (photoId: string, classId?: string, studentName?: string) => void
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
  onDeletePhoto,
  onPlayVideo,
  onOpenGallery,
  saving = false,
  editPhotos
}: MemberCardProps) {
  const [localConfirm, setLocalConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [showFormOverlay, setShowFormOverlay] = useState(false)
  const flipOverlayTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tampilkan overlay form setelah animasi flip selesai (saat buka Edit), agar animasi flip terlihat sama seperti saat Batal
  useEffect(() => {
    if (isFlipped) {
      flipOverlayTimeoutRef.current = setTimeout(() => setShowFormOverlay(true), 500)
      return () => {
        if (flipOverlayTimeoutRef.current) {
          clearTimeout(flipOverlayTimeoutRef.current)
          flipOverlayTimeoutRef.current = null
        }
      }
    } else {
      if (flipOverlayTimeoutRef.current) {
        clearTimeout(flipOverlayTimeoutRef.current)
        flipOverlayTimeoutRef.current = null
      }
      setShowFormOverlay(false)
    }
  }, [isFlipped])

  // Edit form state
  const [editName, setEditName] = useState(member.student_name || '')
  const [editEmail, setEditEmail] = useState(member.email || '')
  const [editTtl, setEditTtl] = useState(member.date_of_birth || '')
  const [editInstagram, setEditInstagram] = useState(member.instagram || '')
  const [editMessage, setEditMessage] = useState(member.message || '')
  const [editVideoUrl, setEditVideoUrl] = useState(member.video_url || '')

  // Pending (staged) files - not uploaded until Save
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; previewUrl: string }[]>([])
  const [pendingVideo, setPendingVideo] = useState<{ file: File; previewUrl: string } | null>(null)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)

  // Reset form when member data changes
  useEffect(() => {
    setEditName(member.student_name || '')
    setEditEmail(member.email || '')
    setEditTtl(member.date_of_birth || '')
    setEditInstagram(member.instagram || '')
    setEditMessage(member.message || '')
    setEditVideoUrl(member.video_url || '')
  }, [member])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl))
      if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl)
    }
  }, [])

  // Reset pending files when card flips back (cancel)
  useEffect(() => {
    if (!isFlipped) {
      pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPendingPhotos([])
      if (pendingVideo) {
        URL.revokeObjectURL(pendingVideo.previewUrl)
        setPendingVideo(null)
      }
    }
  }, [isFlipped])

  const handleSave = () => {
    onSave?.({
      student_name: editName,
      email: editEmail,
      date_of_birth: editTtl,
      instagram: editInstagram,
      message: editMessage,
      video_url: editVideoUrl,
      pendingPhotos: pendingPhotos.map(p => p.file),
      pendingVideo: pendingVideo?.file || null,
    })
    // Cleanup after save
    pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setPendingPhotos([])
    if (pendingVideo) {
      URL.revokeObjectURL(pendingVideo.previewUrl)
      setPendingVideo(null)
    }
  }

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Foto maksimal 10MB')
      e.target.value = ''
      return
    }
    const existingCount = (editPhotos?.length || photos.length)
    const totalPhotos = existingCount + pendingPhotos.length
    if (totalPhotos >= 4) {
      alert('Maksimal 4 foto')
      e.target.value = ''
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setPendingPhotos(prev => [...prev, { file, previewUrl }])
    e.target.value = ''
  }

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      alert('Video maksimal 20MB')
      e.target.value = ''
      return
    }
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.previewUrl)
    const previewUrl = URL.createObjectURL(file)
    setPendingVideo({ file, previewUrl })
    e.target.value = ''
  }

  const removePendingPhoto = (index: number) => {
    setPendingPhotos(prev => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const removePendingVideo = () => {
    if (pendingVideo) {
      URL.revokeObjectURL(pendingVideo.previewUrl)
      setPendingVideo(null)
    }
  }

  const photos = (member.photos || []).map((p, i) => ({ id: `${member.student_name}-${i}`, file_url: p, student_name: member.student_name }))
  const basePhotos = editPhotos && editPhotos.length > 0 ? editPhotos : photos
  const displayPreviewPhotos = [
    ...basePhotos.map(p => ({ ...p, isPending: false })),
    ...pendingPhotos.map((p, i) => ({ id: `pending-${i}`, file_url: p.previewUrl, isPending: true })),
  ]

  return (
    <>
      {/* Hidden inputs for media picking (triggered by buttons). */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoSelected}
      />

      {/* Moderation / Delete Confirmation Modal */}
      {typeof document !== 'undefined' && localConfirm && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setLocalConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] text-center transform transition-all animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{localConfirm.title}</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">{localConfirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLocalConfirm(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => { localConfirm.onConfirm(); setLocalConfirm(null) }}
                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Photo Viewer Modal */}
      {typeof document !== 'undefined' && viewerOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[110] p-4" onClick={() => setViewerOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 max-w-[560px] w-full shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] transform transition-all animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5 border-b-4 border-slate-100 dark:border-slate-700 pb-5">
              <div className="flex gap-3 items-center">
                <button type="button" onClick={() => setViewerIndex(i => Math.max(0, i - 1))} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5" title="Prev"><ChevronLeft className="w-6 h-6" /></button>
                <div className="px-5 py-2.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black text-sm rounded-xl border-2 border-indigo-700 dark:border-indigo-600 shadow-[3px_3px_0_0_#4338ca] dark:shadow-[3px_3px_0_0_#334155]">{viewerIndex + 1} / {displayPreviewPhotos.length}</div>
                <button type="button" onClick={() => setViewerIndex(i => Math.min(i + 1, displayPreviewPhotos.length - 1))} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5" title="Next"><ChevronRight className="w-6 h-6" /></button>
              </div>
              <button type="button" onClick={() => setViewerOpen(false)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 hover:bg-red-500 hover:text-white transition-all shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"><X className="w-6 h-6" /></button>
            </div>

            <div className="w-full flex items-center justify-center mb-6 bg-slate-50 dark:bg-slate-800 rounded-[24px] overflow-hidden border-4 border-slate-900 dark:border-slate-700 shadow-inner" style={{ minHeight: '320px' }}>
              <img src={(displayPreviewPhotos[viewerIndex] && displayPreviewPhotos[viewerIndex].file_url) || firstPhoto || ''} alt={`${member.student_name} ${viewerIndex + 1}`} className="max-h-[60vh] object-contain w-full" />
            </div>

            {displayPreviewPhotos.length > 1 && (
              <div className="flex gap-3 mx-auto justify-center overflow-x-auto p-1 pb-2">
                {displayPreviewPhotos.map((p, i) => (
                  <button key={p.id} onClick={() => setViewerIndex(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-4 transition-all flex-shrink-0 ${i === viewerIndex ? 'border-indigo-500 dark:border-indigo-400 shadow-[4px_4px_0_0_#4338ca] dark:shadow-[4px_4px_0_0_#334155] -translate-y-1' : 'border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 opacity-60 hover:opacity-100 shadow-[2px_2px_0_0_#cbd5e1] dark:shadow-[2px_2px_0_0_#334155]'}`}>
                    <img src={p.file_url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Card Container: perspective di parent agar animasi flip (putar Y), bukan tekuk. */}
      <div className="relative w-full aspect-[1/2] min-h-0 group" style={{ perspective: '1200px', perspectiveOrigin: '50% 50%', transformStyle: 'preserve-3d' }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* ================= FRONT SIDE ================= */}
          <div
            className="relative w-full h-full rounded-2xl border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 transition-[box-shadow,transform] duration-300 flex flex-col overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              pointerEvents: isFlipped ? 'none' : 'auto',
              zIndex: isFlipped ? 0 : 1
            }}
          >
            {/* Photo Section */}
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0 border-b-4 border-slate-900 dark:border-slate-700">
              {photos.length > 0 || firstPhoto ? (
                <img
                  src={photos.length > 0 ? photos[0].file_url : firstPhoto || ''}
                  alt={member.student_name}
                  className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-700"
                  onClick={() => {
                    if (photos.length > 0) { setViewerIndex(0); setViewerOpen(true) }
                    else if (onOpenGallery) onOpenGallery(classId, member.student_name)
                  }}
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => onOpenGallery && onOpenGallery(classId, member.student_name)}
                >
                  <ImagePlus className="w-10 h-10 mb-2 opacity-40" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Belum ada foto</span>
                </div>
              )}

              {/* Video Badge Overlay */}
              {member.video_url && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (onPlayVideo) onPlayVideo(member.video_url!) }}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-indigo-400 dark:bg-indigo-600 text-white border-2 border-slate-900 dark:border-slate-600 flex items-center justify-center transition-all hover:scale-110 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  title="Putar Video"
                >
                  <Play className="w-5 h-5 ml-1" fill="currentColor" />
                </button>
              )}
            </div>

            {/* Content Section - Increased padding for a slightly larger card */}
            <div className="flex flex-col flex-1 p-4 bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="mb-2.5 flex flex-col">
                <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight line-clamp-1 break-words pb-0.5 uppercase tracking-tight">
                  {member.student_name}
                  {member.is_me && <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] align-middle">ANDA</span>}
                </h3>
              </div>

              {/* Profile Details List */}
              <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {member.email && (
                  <div className="flex items-center gap-2 group/link">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={2.5} />
                    <span className="line-clamp-1 lowercase">{member.email}</span>
                  </div>
                )}
                {member.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={2.5} />
                    <span className="line-clamp-1">{member.date_of_birth}</span>
                  </div>
                )}
                {member.instagram && (
                  <a
                    href={member.instagram.startsWith('http') ? member.instagram : `https://instagram.com/${member.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" strokeWidth={2.5} />
                    <span className="line-clamp-1 font-black">{member.instagram.startsWith('@') ? member.instagram : '@' + member.instagram}</span>
                  </a>
                )}
              </div>

              {/* Message Block */}
              {member.message && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 relative flex-1 flex flex-col min-h-0 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]">
                  <Quote className="absolute -top-2 -left-2 w-5 h-5 text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-full p-1 border-2 border-slate-900 dark:border-slate-600" />
                  <p className="italic font-bold text-slate-600 dark:text-slate-300 leading-snug text-xs line-clamp-3 pl-1 pt-0.5">
                    "{stripQuotes(member.message)}"
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons (Bottom) */}
            <div className="px-3 pb-3 mt-auto bg-white dark:bg-slate-900 flex-shrink-0">
              <div className="flex gap-2.5">
                {(canManage || member.is_me || hasApprovedAccess) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStartEdit?.(member) }}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-700 dark:border-indigo-600 hover:bg-indigo-700 hover:text-white transition-all flex items-center justify-center gap-2 py-2 shadow-[3px_3px_0_0_#4338ca] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onDeleteClick?.()}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-2 border-red-600 dark:border-red-700 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 py-2 shadow-[3px_3px_0_0_#dc2626] dark:shadow-[3px_3px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    title="Hapus anggota"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ================= BACK SIDE (EDIT FORM) ================= - rotateY(180deg) agar saat container 180deg wajah form menghadap user */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d',
              pointerEvents: isFlipped ? 'auto' : 'none',
              zIndex: isFlipped ? 1 : 0
            }}
            className="absolute inset-0 w-full h-full flex flex-col rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-slate-900 dark:border-slate-700 bg-amber-300 dark:bg-amber-600 flex items-center gap-3 flex-shrink-0">
              <button type="button" className="w-8 h-8 rounded-lg border-2 border-slate-900 dark:border-slate-600 hover:bg-white/20 dark:hover:bg-slate-800/50 flex items-center justify-center bg-white dark:bg-slate-800 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all" onClick={onCancelEdit}>
                <ChevronLeft className="w-5 h-5 text-slate-900 dark:text-white" />
              </button>
              <h3 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">Edit Profil</h3>
            </div>

            {/* Form Scrollable Area - Ultra compact layout */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-white dark:bg-slate-900" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName || ''}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editEmail || ''}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Instagram</label>
                  <input
                    type="text"
                    value={editInstagram || ''}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="@ig"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Tempat, Tanggal Lahir</label>
                <input
                  type="text"
                  value={editTtl || ''}
                  onChange={(e) => setEditTtl(e.target.value)}
                  placeholder="Ttl (Sby, 1 Jan 2005)"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Photo Preview List */}
              <div className="pt-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 block">Foto Galeri (Maks 4)</label>
                {displayPreviewPhotos.length > 0 && (
                  <div className="flex gap-3 flex-wrap mb-3">
                    {displayPreviewPhotos.map((photo, idx) => (
                      <div key={photo.id} className="relative w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                        {photo.isPending && (
                          <div className="absolute -top-2 -left-2 bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border-2 border-slate-900 dark:border-slate-600 z-10 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] uppercase">BARU</div>
                        )}
                        <img
                          src={photo.file_url}
                          alt={`preview-${idx}`}
                          className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => { setViewerIndex(idx); setViewerOpen(true) }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (photo.isPending) {
                              removePendingPhoto(idx - basePhotos.length)
                            } else {
                              setLocalConfirm({ title: 'Hapus Foto', message: `Hapus foto ini?`, onConfirm: () => onDeletePhoto?.(photo.id, classId, member.student_name) })
                            }
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:bg-red-600 transition-all z-20 border-2 border-slate-900 dark:border-slate-600 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Media Upload Buttons */}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={displayPreviewPhotos.length >= 4}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-700 dark:border-emerald-600 hover:bg-emerald-700 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[2px_2px_0_0_#047857] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <ImagePlus className="w-4 h-4" /> Foto ({displayPreviewPhotos.length}/4)
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-sky-700 dark:border-sky-600 hover:bg-sky-700 hover:text-white transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#0369a1] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Video className="w-4 h-4" /> Video
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Link YouTube</label>
                <input
                  type="url"
                  value={editVideoUrl || ''}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="Link YouTube"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Pesan / Kesan</label>
                <textarea
                  value={editMessage || ''}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Pesan / Kesan"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />
              </div>
            </div>

            {/* Editing Action Buttons */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t-2 border-slate-900 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-all border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? 'Loading...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                Batal
              </button>
            </div>
          </div>
        </div>

        {/* Form overlay when flipped: not transformed so inputs/buttons are always clickable (3D flip blocks pointer events in some browsers) */}
        {isFlipped && showFormOverlay && (
          <div
            className="absolute inset-0 z-20 flex flex-col rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] overflow-hidden"
          >
            <div className="px-4 py-3 border-b-2 border-slate-900 dark:border-slate-700 bg-amber-300 dark:bg-amber-600 flex items-center gap-3 flex-shrink-0">
              <button type="button" className="w-8 h-8 rounded-lg border-2 border-slate-900 dark:border-slate-600 hover:bg-white/20 dark:hover:bg-slate-800/50 flex items-center justify-center bg-white dark:bg-slate-800 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all" onClick={onCancelEdit}>
                <ChevronLeft className="w-5 h-5 text-slate-900 dark:text-white" />
              </button>
              <h3 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">Edit Profil</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-white dark:bg-slate-900 min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName || ''}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Email</label>
                  <input type="email" value={editEmail || ''} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Instagram</label>
                  <input type="text" value={editInstagram || ''} onChange={(e) => setEditInstagram(e.target.value)} placeholder="@ig" className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Tempat, Tanggal Lahir</label>
                <input type="text" value={editTtl || ''} onChange={(e) => setEditTtl(e.target.value)} placeholder="Ttl (Sby, 1 Jan 2005)" className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>
              <div className="pt-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 block">Foto Galeri (Maks 4)</label>
                {displayPreviewPhotos.length > 0 && (
                  <div className="flex gap-3 flex-wrap mb-3">
                    {displayPreviewPhotos.map((photo, idx) => (
                      <div key={photo.id} className="relative w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                        {photo.isPending && <div className="absolute -top-2 -left-2 bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border-2 border-slate-900 dark:border-slate-600 z-10 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] uppercase">BARU</div>}
                        <img src={photo.file_url} alt={`preview-${idx}`} className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setViewerIndex(idx); setViewerOpen(true) }} />
                        <button type="button" onClick={(e) => { e.stopPropagation(); if (photo.isPending) removePendingPhoto(idx - basePhotos.length); else setLocalConfirm({ title: 'Hapus Foto', message: 'Hapus foto ini?', onConfirm: () => onDeletePhoto?.(photo.id, classId, member.student_name) }) }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:bg-red-600 transition-all z-20 border-2 border-slate-900 dark:border-slate-600 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={displayPreviewPhotos.length >= 4} className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-700 dark:border-emerald-600 hover:bg-emerald-700 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[2px_2px_0_0_#047857] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"><ImagePlus className="w-4 h-4" /> Foto ({displayPreviewPhotos.length}/4)</button>
                  <button type="button" onClick={() => videoInputRef.current?.click()} className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-sky-700 dark:border-sky-600 hover:bg-sky-700 hover:text-white transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#0369a1] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"><Video className="w-4 h-4" /> Video</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Link YouTube</label>
                <input type="url" value={editVideoUrl || ''} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="Link YouTube" className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 block">Pesan / Kesan</label>
                <textarea value={editMessage || ''} onChange={(e) => setEditMessage(e.target.value)} placeholder="Pesan / Kesan" rows={2} className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" />
              </div>
            </div>
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t-2 border-slate-900 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button type="button" onClick={handleSave} disabled={saving} className="flex-[2] px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-all border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center">{saving ? 'Loading...' : 'Simpan'}</button>
              <button type="button" onClick={onCancelEdit} className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">Batal</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
