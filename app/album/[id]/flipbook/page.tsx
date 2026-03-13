'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import ManualFlipbookViewer from '@/components/yearbook/components/ManualFlipbookViewer'
import { apiUrl } from '@/lib/api-url'

type ManualFlipbookPage = {
  id: string
  page_number: number
  image_url: string
  width?: number
  height?: number
  flipbook_video_hotspots?: { id: string; page_id: string; video_url: string; x: number; y: number; width: number; height: number }[]
}

export default function PublicFlipbookPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [pages, setPages] = useState<ManualFlipbookPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [albumName, setAlbumName] = useState<string>('Preview Flipbook')

  const fetchPages = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/albums/${id}/flipbook/public`), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError((data && data.error) ? data.error : 'Gagal memuat flipbook.')
        setPages([])
        return
      }

      let fetchedPages = []
      if (Array.isArray(data)) {
        fetchedPages = data
      } else if (data && Array.isArray(data.pages)) {
        fetchedPages = data.pages
        if (data.albumName) setAlbumName(data.albumName)
      }

      setPages(fetchedPages)
    } catch {
      setError('Gagal memuat flipbook.')
      setPages([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  const handlePlayVideo = (url: string) => {
    if (!url) return
    if (url.startsWith('http') && !url.includes('/storage/')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.open(apiUrl(`/api/albums/${id}/video-play/public?url=${encodeURIComponent(url)}`), '_blank', 'noopener,noreferrer')
    }
  }

  if (!id) {
    return (
      <div className="min-h-[100dvh] bg-amber-300 flex flex-col items-center justify-center p-4">
        <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-slate-900 font-black text-lg uppercase tracking-tight mb-4">Album ID tidak valid</p>
          <Link href="/" className="inline-block px-6 py-3 bg-indigo-400 text-white font-black text-sm uppercase rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Kembali ke Beranda</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-amber-300 flex flex-col items-center justify-center p-4">
        <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] rounded-2xl p-8 max-w-sm w-full flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4 items-center" />
          <p className="text-slate-900 font-black uppercase tracking-widest text-sm text-center">Memuat Flipbook...</p>
        </div>
      </div>
    )
  }

  if (error || pages.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-amber-300 flex flex-col items-center justify-center p-4">
        <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-slate-900 font-black text-lg uppercase tracking-tight mb-6">{error || 'Belum ada halaman.'}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-indigo-400 text-white font-black text-sm uppercase rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Kembali ke Beranda</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border-b-2 border-slate-900 z-10 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex flex-shrink-0 items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 gap-1.5 text-xs font-black text-slate-900 bg-white border-2 border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={3} />
          <span className="hidden lg:inline uppercase tracking-widest">Kembali</span>
        </button>
        <span className="flex-1 text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate text-center">{albumName}</span>
        <div className="w-8 lg:w-28" />
      </header>
      <main className="flex-1 min-h-0 flex flex-col p-0 bg-transparent">
        <ManualFlipbookViewer
          pages={pages}
          onPlayVideo={handlePlayVideo}
          className="h-full w-full"
          albumId={id}
        />
      </main>
    </div>
  )
}
