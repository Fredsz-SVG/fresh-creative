'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { AnimatedCarouselMockup, AnimatedFlipbookMockup } from '@/components/dashboard/AnimatedMockups'
import { GalleryHorizontal, BookMarked, PlusCircle, UserPlus, X, Plus, Loader2, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'

/** Extract token from URL atau kode */
function parseInviteToken(input: string): { token: string; type: 'join' | 'invite' | 'code' } | null {
  let trimmed = input.trim()
  trimmed = trimmed.replace(/^(kode|code)\s*[:\-]\s*/i, '').trim()
  if (!trimmed) return null
  try {
    if (/^[a-zA-Z0-9_-]{6,80}$/.test(trimmed)) return { token: trimmed, type: 'code' }
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://x')
    const path = url.pathname
    const joinMatch = path.match(/\/join\/([^/]+)/i)
    if (joinMatch) return { token: joinMatch[1], type: 'join' }
    const inviteMatch = path.match(/\/invite\/([^/]+)/i)
    if (inviteMatch) return { token: inviteMatch[1], type: 'invite' }
    return null
  } catch {
    return null
  }
}

type ShowcaseAlbumPreview = {
  title: string
  imageUrl?: string
  link: string
}

export default function UserPage() {
  const [showcaseLoading, setShowcaseLoading] = useState(true)
  const [albumPreviews, setAlbumPreviews] = useState<ShowcaseAlbumPreview[]>([])
  const [flipbookPreviewUrl, setFlipbookPreviewUrl] = useState('')
  const [userName, setUserName] = useState<string | null>(null)
  const [nameLoaded, setNameLoaded] = useState(false)
  const [showCarouselPreview, setShowCarouselPreview] = useState(false)

  // New States for synced UI
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteLinkInput, setInviteLinkInput] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const hasToastedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('toast') === 'google_signup_success' && !hasToastedRef.current) {
      toast.success('Berhasil buat! Anda telah masuk melalui Google.')
      hasToastedRef.current = true
      window.history.replaceState(null, '', '/user')
    }
  }, [searchParams])

  const fetchShowcase = useCallback(async () => {
    setShowcaseLoading(true)
    try {
      const res = await fetch(apiUrl('/api/showcase'), { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data) {
        const previews = Array.isArray(data.albumPreviews) ? data.albumPreviews : []
        setAlbumPreviews(previews)
        setFlipbookPreviewUrl(typeof data.flipbookPreviewUrl === 'string' ? data.flipbookPreviewUrl : '')
      } else {
        setAlbumPreviews([])
        setFlipbookPreviewUrl('')
      }
    } catch {
      setAlbumPreviews([])
      setFlipbookPreviewUrl('')
    } finally {
      setShowcaseLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShowcase()
  }, [fetchShowcase])

  useEffect(() => {
    let isActive = true
    const loadUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isActive) return
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]
      if (name) setUserName(String(name))
      setNameLoaded(true)
    }
    loadUserName()
    return () => {
      isActive = false
    }
  }, [])

  const handleOpenInviteLink = async () => {
    setJoinError(null)
    const parsed = parseInviteToken(inviteLinkInput)
    if (!parsed) {
      setJoinError('Masukkan kode undangan atau tempel link.')
      return
    }
    const { token, type } = parsed
    if (type === 'invite') {
      router.push(`/invite/${token}`)
      return
    }
    setJoinLoading(true)
    try {
      const res = await fetchWithAuth(`/api/albums/invite/${encodeURIComponent(token)}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data?.redirectTo) {
          router.push(data.redirectTo)
          return
        }
        const albumId = data?.albumId
        if (albumId) {
          router.push(`/user/album/yearbook/${albumId}`)
        } else {
          router.push('/user/albums')
        }
        return
      }
      setJoinError(typeof data?.error === 'string' ? data.error : 'Gagal bergabung.')
    } catch {
      setJoinError('Gagal bergabung. Coba lagi.')
    } finally {
      setJoinLoading(false)
    }
  }


  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-12">
      {/* Welcome Hero Section */}
      <div className="relative bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-12 border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a]">
        {/* Retro Grid Pattern & Background color */}
        <div className="absolute inset-0 bg-[#f8fafc]" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

        {/* Decorative solid-colored brutalist blobs */}
        <div className="absolute top-0 right-0 -translate-y-8 sm:-translate-y-12 translate-x-1/3 w-40 h-40 sm:w-64 sm:h-64 bg-emerald-400 rounded-full border-4 border-slate-900 shadow-[2px_2px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-32 h-32 sm:w-56 sm:h-56 bg-indigo-400 rounded-full border-4 border-slate-900 shadow-[2px_2px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl space-y-4 sm:space-y-6">
            <div className="mb-2">
              <h1 className="text-[26px] leading-[1.1] sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight sm:leading-tight mb-3">
                Welcome,<br className="sm:hidden" />{' '}
                {nameLoaded ? (
                  <span className="text-indigo-600 underline decoration-slate-900 decoration-4 sm:decoration-4 underline-offset-4">{userName || 'Pengguna'}</span>
                ) : (
                  <span className="inline-block h-6 sm:h-8 w-32 sm:w-48 bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] animate-pulse align-middle" aria-hidden />
                )}
              </h1>
              <div className="relative inline-block">
                <p className="text-[13px] sm:text-lg font-bold text-slate-700 bg-white px-5 py-2 sm:px-8 sm:py-3 border-4 border-slate-900 rounded-[2.5rem] shadow-[4px_4px_0_0_#0f172a] sm:shadow-[6px_6px_0_0_#0f172a] leading-relaxed relative z-10">
                  Buat, rancang, dan kelola buku kenangan digital angkatanmu dengan mudah dari sini.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-8">
        {/* Album Carousel Showcase Card */}
        <div className="group rounded-[1.25rem] sm:rounded-[2rem] border-2 border-slate-900 bg-white shadow-[4px_4px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a] overflow-hidden hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_0_#0f172a] sm:hover:shadow-[4px_4px_0_0_#0f172a] transition-all duration-300 flex flex-col">
          <div className="p-3 sm:p-6 border-b-2 border-slate-900 flex flex-col items-center justify-center bg-white relative z-10 w-full text-center">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 rounded-xl bg-orange-50 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center">
              <GalleryHorizontal className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <h3 className="text-[13px] sm:text-[18px] font-black text-slate-800 tracking-tight leading-tight">Swipe Album</h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-tight mt-1.5 hidden sm:block px-2">Eksplorasi profil dengan mudah lewat kontrol geser.</p>
          </div>
          <div className="relative p-2 sm:p-10 flex flex-col items-center justify-center border-t border-gray-100 min-h-[220px] sm:min-h-[480px] overflow-hidden bg-slate-50/50">
            {/* Dotted Grid Pattern Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-50/90" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-300/20 blur-[50px] pointer-events-none" />

            {showcaseLoading ? (
              <div className="relative z-10 w-full max-w-[220px] sm:max-w-[300px] aspect-[3/4] rounded-2xl bg-white flex items-center justify-center animate-pulse shadow-sm border border-slate-100">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-emerald-500" />
              </div>
            ) : albumPreviews.length === 0 ? (
              <div className="relative z-10 w-full flex flex-col items-center py-8">
                <div className="relative group cursor-not-allowed">
                  <AnimatedCarouselMockup />
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 text-slate-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm">Belum diatur</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 w-full flex flex-col items-center py-2 transition-all duration-500 hover:-translate-y-2 hover:drop-shadow-2xl">
                {(() => {
                  const item = albumPreviews[0]; // Hanya satu saja
                  const idMatch = item.link.match(/(?:album|yearbook)\/([^/?]+)/);
                  const embedUrl = idMatch ? `/album/${idMatch[1]}/preview` : item.link;

                  return (
                    <>
                      <div
                        className="w-full h-full relative cursor-pointer group flex justify-center"
                        onClick={() => setShowCarouselPreview(true)}
                      >
                        <AnimatedCarouselMockup imageUrl={item.imageUrl} />
                        <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="px-5 py-3 bg-white/95 backdrop-blur-md rounded-full text-slate-800 text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                            <GalleryHorizontal className="w-4 h-4 text-emerald-600" />
                            <span>Buka Carousel</span>
                          </div>
                        </div>
                      </div>

                      {/* Fullscreen Overlay for Preview */}
                      {showCarouselPreview && (
                        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col cursor-auto">
                          <div className="absolute top-4 right-4 z-50">
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowCarouselPreview(false); }}
                              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all border border-white/20"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                          <div className="flex-1 w-full h-full relative">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full border-0 absolute inset-0 bg-transparent"
                              allow="fullscreen; autoplay; encrypted-media"
                              allowFullScreen
                              title="Album Carousel Preview"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Flipbook Showcase Card */}
        <div className="group rounded-[1.25rem] sm:rounded-[2rem] border-2 border-slate-900 bg-white shadow-[4px_4px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a] overflow-hidden hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_0_#0f172a] sm:hover:shadow-[4px_4px_0_0_#0f172a] transition-all duration-300 flex flex-col">
          <div className="p-3 sm:p-6 border-b-2 border-slate-900 flex flex-col items-center justify-center bg-white relative z-10 w-full text-center">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 rounded-xl bg-emerald-50 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center">
              <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
            </div>
            <h3 className="text-[13px] sm:text-[18px] font-black text-slate-800 tracking-tight leading-tight">3D Flipbook</h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-tight mt-1.5 hidden sm:block px-2">Sensasi otentik membalik lembaran fisik memori digitalmu.</p>
          </div>
          <div className="relative p-2 sm:p-10 flex flex-col items-center justify-center border-t border-gray-100 min-h-[220px] sm:min-h-[480px] overflow-hidden bg-slate-50/50">
            {/* Dotted Grid Pattern Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-50/90" />
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-emerald-300/20 blur-[50px] pointer-events-none" />

            {flipbookPreviewUrl ? (
              <div className="relative z-10 text-center space-y-8 w-full">
                <div className="relative group cursor-pointer w-full flex justify-center hover:-translate-y-2 transition-transform duration-500 hover:drop-shadow-2xl">
                  {flipbookPreviewUrl.startsWith('/') ? (
                    <Link href={flipbookPreviewUrl} className="block w-full">
                      <AnimatedFlipbookMockup />
                    </Link>
                  ) : (
                    <a href={flipbookPreviewUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                      <AnimatedFlipbookMockup />
                    </a>
                  )}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <span className="bg-slate-800/90 text-white font-bold px-4 py-2 rounded-full shadow-lg text-sm backdrop-blur-md">Buka Flipbook →</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center space-y-8 w-full">
                <div className="relative group cursor-not-allowed w-full flex justify-center grayscale opacity-50">
                  <AnimatedFlipbookMockup />
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 text-slate-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm">Belum diatur</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Bottom */}
      <div className="flex flex-col items-center gap-6 pt-6 sm:pt-8 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setConfirmModal('yearbook')}
            className="inline-flex items-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-indigo-500 border-2 border-slate-900 text-white text-lg font-black tracking-wide shadow-[6px_6px_0_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_0_#0f172a] transition-all duration-300"
          >
            <PlusCircle className="w-6 h-6" />
            <span>Create Project Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setShowJoinForm(!showJoinForm)}
            className={`inline-flex items-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl border-2 border-slate-900 text-lg font-black tracking-wide shadow-[6px_6px_0_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_0_#0f172a] transition-all duration-300 ${showJoinForm ? 'bg-slate-200 text-slate-600 shadow-none translate-x-1 translate-y-1' : 'bg-orange-300 text-slate-900'}`}
          >
            <UserPlus className="w-6 h-6" />
            <span>{showJoinForm ? 'Tutup Form Join' : 'Join Project'}</span>
          </button>
        </div>

        {/* Revealable Join Form di Bawah Tombol */}
        {showJoinForm && (
          <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-3 p-5 bg-white border-2 border-slate-900 rounded-2xl animate-in slide-in-from-bottom-4 duration-300 shadow-[8px_8px_0_0_#0f172a]">
            <div className="flex-1 relative">
              <input
                type="text"
                autoFocus
                value={inviteLinkInput}
                onChange={(e) => { setInviteLinkInput(e.target.value); setJoinError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenInviteLink()}
                placeholder="Masukan kode undangan atau link..."
                className="w-full px-5 py-3 text-base font-bold rounded-xl bg-white border-2 border-slate-900 shadow-inner text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {joinError && <p className="text-xs text-red-500 absolute -bottom-5 left-1 font-bold">{joinError}</p>}
            </div>
            <button
              type="button"
              onClick={handleOpenInviteLink}
              disabled={joinLoading}
              className="px-8 py-3 text-base font-black rounded-xl bg-slate-900 text-white shadow-[4px_4px_0_0_#475569] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
            >
              {joinLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Join Sekarang!'}
            </button>
          </div>
        )}
        {/* Modal Konfirmasi Create Project */}
        {confirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 max-w-sm w-full shadow-[8px_8px_0_0_#0f172a]" onClick={(e) => e.stopPropagation()}>
              <p className="text-xl font-black text-slate-900 mb-6">
                Mau buat project baru?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/user/showroom')}
                  className="w-full flex items-center justify-center gap-2 py-4 text-base font-black rounded-2xl bg-emerald-400 border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-900 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Go to Form
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Nanti dulu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
