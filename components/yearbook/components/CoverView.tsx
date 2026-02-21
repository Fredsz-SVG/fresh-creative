'use client'

import { BookOpen, ImagePlus, Video, Trash2, Play } from 'lucide-react'

interface CoverViewProps {
  album: any
  isOwner: boolean
  uploadingCover: boolean
  coverUploadInputRef: React.RefObject<HTMLInputElement>
  setCoverPreview: (v: { file: File; dataUrl: string } | null) => void
  setCoverPosition: (v: { x: number; y: number }) => void
  handleDeleteCover?: () => void
  coverVideoInputRef: React.RefObject<HTMLInputElement>
  uploadingCoverVideo: boolean
  handleUploadCoverVideo?: (file: File) => Promise<void>
  handleDeleteCoverVideo?: () => void
  onPlayVideo?: (url: string) => void
}

export default function CoverView({
  album,
  isOwner,
  uploadingCover,
  coverUploadInputRef,
  setCoverPreview,
  setCoverPosition,
  handleDeleteCover,
  coverVideoInputRef,
  uploadingCoverVideo,
  handleUploadCoverVideo,
  handleDeleteCoverVideo,
  onPlayVideo,
}: CoverViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-full">
      <div className="w-full max-w-xs mx-auto flex flex-col items-center">
        <div className="relative w-full aspect-[3/4] bg-white/5 rounded-xl overflow-hidden shadow-xl border border-white/10 group">
          {album?.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt={album.name}
              className="w-full h-full object-cover"
              style={album.cover_image_position ? { objectPosition: `${album.cover_image_position}` } : undefined}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-muted gap-3">
              <BookOpen className="w-12 h-12 opacity-50" />
              <span className="text-xs">Sampul album</span>
            </div>
          )}

          {/* Video Overlay Button */}
          {album?.cover_video_url && (
            <button
              type="button"
              onClick={() => onPlayVideo && onPlayVideo(album.cover_video_url!)}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center group/play transition-all hover:scale-110 backdrop-blur-sm border border-white/10"
              title="Play Video Sampul"
            >
              <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
            </button>
          )}
        </div>

        <div className="mt-4 text-center w-full">
          <h1 className="text-2xl font-bold text-app mb-1">{album?.name}</h1>
          {album?.description && <p className="text-muted text-xs max-w-lg mx-auto leading-relaxed">{album.description}</p>}
        </div>

        {isOwner && (
          <div className="mt-6 p-3 w-full rounded-xl bg-white/5 border border-white/10">
            <div className="mb-3 text-center">
              <p className="text-xs font-semibold text-app">Pengaturan Sampul</p>
            </div>
            
            {/* Gambar Section */}
            <div className="mb-3">
              <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Gambar <span className="normal-case text-muted/80">(maks. 10MB)</span></p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coverUploadInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all disabled:opacity-50 min-h-[36px]"
                >
                  <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{uploadingCover ? 'Upload...' : (album?.cover_image_url ? 'Ubah' : 'Upload')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCover}
                  disabled={!album?.cover_image_url || !handleDeleteCover}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-medium border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Hapus</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 my-2.5"></div>

            {/* Video Section */}
            <div>
              <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Video <span className="normal-case text-muted/80">(maks. 20MB)</span></p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => coverVideoInputRef.current?.click()}
                  disabled={uploadingCoverVideo}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all disabled:opacity-50 min-h-[36px]"
                >
                  <Video className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{uploadingCoverVideo ? 'Upload...' : (album?.cover_video_url ? 'Ubah' : 'Upload')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCoverVideo}
                  disabled={!album?.cover_video_url || !handleDeleteCoverVideo}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-medium border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Hapus</span>
                </button>
              </div>
            </div>

            {/* Hidden inputs */}
            <input
              ref={coverUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && setCoverPreview) {
                  const dataUrl = URL.createObjectURL(file)
                  setCoverPreview({ file, dataUrl })
                  setCoverPosition && setCoverPosition({ x: 50, y: 50 })
                }
                e.target.value = ''
              }}
            />
            <input
              ref={coverVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file && handleUploadCoverVideo) {
                  await handleUploadCoverVideo(file)
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
