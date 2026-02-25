'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Check, X, Trash2, UserPlus, Loader2, ImagePlus, BookOpen, ChevronRight, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getYearbookSectionQueryUrl } from '../yearbook/lib/yearbook-paths'

/** Extract token from URL atau kode (alphanumeric + - _, 6–80 char; support token lama yang panjang). */
function parseInviteToken(input: string): { token: string; type: 'join' | 'invite' | 'code' } | null {
  let trimmed = input.trim()
  // Buang prefix umum saat user copy-paste teks "Kode: xyz"
  trimmed = trimmed.replace(/^(kode|code)\s*[:\-]\s*/i, '').trim()
  if (!trimmed) return null
  try {
    // Terima kode 6–80 karakter (alphanumeric, base64url punya - dan _)
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

export type AlbumRow = {
  id: string
  name: string
  type: 'public' | 'yearbook'
  status?: 'pending' | 'approved' | 'declined'
  created_at?: string
  lead_id?: string
  album_id?: string | null
  leads?: { school_name: string } | null
  pricing_package_id?: string | null
  pricing_packages?: { name: string } | null
  isOwner?: boolean
  school_city?: string
  kab_kota?: string
  wa_e164?: string
  province_id?: string
  province_name?: string
  pic_name?: string
  students_count?: number
  source?: string
  total_estimated_price?: number
  payment_status?: 'unpaid' | 'paid'
  payment_url?: string | null
}

export type AlbumsViewProps = {
  variant: 'user' | 'admin'
  initialData?: AlbumRow[]
  fetchUrl?: string
  linkContext?: 'user' | 'admin'
  active?: boolean
}

function AlbumCard({
  album,
  variant,
  basePath,
  pathname,
  onApprove,
  onDecline,
  onDelete,
  onInvite,
  onPay,
  loadingId,
}: {
  album: AlbumRow
  variant: 'user' | 'admin'
  basePath: string
  onApprove?: (album: AlbumRow) => void
  onDecline?: (album: AlbumRow) => void
  onDelete?: (album: AlbumRow) => void
  onInvite?: (album: AlbumRow) => void
  onPay?: (album: AlbumRow) => void
  loadingId?: string | null
  pathname?: string | null
}) {
  const isAdmin = variant === 'admin'
  const isPaid = album.payment_status === 'paid'
  const isApproved = album.status === 'approved'
  const isClickable = album.type === 'public' || (isApproved && (isPaid || isAdmin))
  const destinationUrl = album.type === 'public'
    ? `${basePath}/album/public/${album.id}`
    : getYearbookSectionQueryUrl(album.album_id ?? album.id, 'cover', pathname || null)

  const created = album.created_at ? new Date(album.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const statusLabel = album.type === 'yearbook' ? (album.status ?? 'pending') : 'public'
  const canSeeApproved = isAdmin || album.isOwner === true
  const shouldShowStatus = !(statusLabel === 'approved' && !canSeeApproved)
  const displayStatus = statusLabel as string
  const displayPaymentStatus = album.payment_status || 'unpaid'
  const isLoading = loadingId === album.id

  const CardContent = () => (
    <div
      className={`border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col h-full transition-all duration-200 min-h-[120px] ${isClickable ? 'cursor-pointer hover:border-lime-500/50 active:bg-white/5' : 'cursor-default bg-white/[0.03]'
        }`}>
      <div className="flex-grow">
        <h2 className="text-base font-semibold text-app truncate sm:text-lg" title={album.name}>{album.name}</h2>
        {album.type === 'yearbook' ? (
          <p className="text-xs text-muted mt-0.5 sm:text-sm">{album.pricing_packages?.name?.replace(/^Paket\s+/i, '') || 'Yearbook'}</p>
        ) : (
          <p className="text-xs text-sky-400 mt-0.5 sm:text-sm">Public Album</p>
        )}
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {shouldShowStatus && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${displayStatus === 'approved' ? 'bg-green-500/20 text-green-400' :
                displayStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  displayStatus === 'declined' ? 'bg-red-500/20 text-red-400' :
                    'bg-sky-500/20 text-sky-400'
                }`}>
              Status: {displayStatus}
            </span>
          )}
          {created && <span className="text-xs text-muted">{created}</span>}
          {album.type === 'yearbook' && isApproved && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${isPaid ? 'bg-lime-500/20 text-lime-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {isPaid ? 'Lunas' : 'Belum Bayar'}
            </span>
          )}
        </div>
      </div>

      {isAdmin && album.type === 'yearbook' && (onApprove || onDecline || onDelete) && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          {album.status !== 'approved' && onApprove && (
            <button
              type="button"
              disabled={!!loadingId}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApprove(album) }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {album.status !== 'declined' && onDecline && (
            <button
              type="button"
              disabled={!!loadingId}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDecline(album) }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              disabled={!!loadingId}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(album) }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-red-600/80 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
          {album.isOwner !== false && isApproved && !isPaid && onPay && (
            <button
              type="button"
              disabled={!!loadingId}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPay(album) }}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Bayar Sekarang
            </button>
          )}
          {album.isOwner !== false && onInvite && (album.album_id ?? album.type === 'public') && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInvite(album) }}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg bg-sky-600/80 text-white hover:bg-sky-600"
            >
              <UserPlus className="w-3.5 h-3.5" /> Undang Teman
            </button>
          )}
          <p className="text-xs text-muted text-center">
            {isClickable ? 'Klik untuk buka' : statusLabel === 'pending' ? 'Menunggu persetujuan admin' : isApproved && !isPaid ? 'Selesaikan pembayaran untuk akses' : statusLabel === 'declined' ? 'Akses dibatasi' : 'Klik untuk buka'}
          </p>
        </div>
      )}
    </div>
  )

  if (isClickable && !isLoading) {
    return (
      <Link href={destinationUrl}><CardContent /></Link>
    )
  }
  return <CardContent />
}

export default function AlbumsView({ variant, initialData, fetchUrl = '/api/albums', linkContext, active = true }: AlbumsViewProps) {
  const [albums, setAlbums] = useState<AlbumRow[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)
  const [inviteModal, setInviteModal] = useState<{ link: string; code: string; albumName: string } | null>(null)
  const [inviteLinkInput, setInviteLinkInput] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<'personal' | 'yearbook' | null>(null)
  const [invoicePopupUrl, setInvoicePopupUrl] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = variant === 'admin'
  const resolvedLinkContext = linkContext ?? (isAdmin ? 'admin' : 'user')
  const linkBasePath = resolvedLinkContext === 'admin' ? '/admin' : '/user/portal'
  const hasFetchedRef = useRef<boolean>(!!initialData)
  const isFetchingRef = useRef(false)
  const lastRealtimeFetchRef = useRef(0)

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums
    const q = searchQuery.trim().toLowerCase()
    return albums.filter((a) =>
      a.name?.toLowerCase().includes(q) ||
      a.school_city?.toLowerCase().includes(q) ||
      a.pic_name?.toLowerCase().includes(q) ||
      a.pricing_packages?.name?.toLowerCase().includes(q) ||
      a.wa_e164?.includes(q)
    )
  }, [albums, searchQuery])

  const paginatedAlbums = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAlbums.slice(start, start + itemsPerPage)
  }, [filteredAlbums, currentPage, itemsPerPage])
  const totalPages = Math.ceil(filteredAlbums.length / itemsPerPage)

  const fetchAlbums = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return
    if (!silent) setLoading(true)
    try {
      isFetchingRef.current = true
      const res = await fetch(fetchUrl, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch albums')
      const data = await res.json()
      setAlbums(data)
    } catch (err) {
      console.error(err)
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }, [fetchUrl])

  useEffect(() => {
    if (initialData && initialData.length >= 0) {
      hasFetchedRef.current = true
    }
  }, [initialData])

  useEffect(() => {
    if (hasFetchedRef.current) return
    if (active) {
      fetchAlbums()
    } else {
      fetchAlbums(true)
    }
    hasFetchedRef.current = true
  }, [active, fetchAlbums])

  useEffect(() => {
    const channel = supabase
      .channel(`albums-realtime-${variant}-${resolvedLinkContext}-${fetchUrl.includes('scope=mine') ? 'mine' : 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => {
        const now = Date.now()
        if (now - lastRealtimeFetchRef.current < 500) return
        lastRealtimeFetchRef.current = now
        fetchAlbums(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAlbums, fetchUrl, resolvedLinkContext, variant, active])

  const handleApprove = async (e: React.MouseEvent, album: AlbumRow) => {
    e.stopPropagation()
    setLoadingId(album.id)
    try {
      const res = await fetch('/api/albums', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: album.id, status: 'approved' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error ?? 'Gagal approve')
        return
      }
      await fetchAlbums(true)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDecline = async (e: React.MouseEvent, album: AlbumRow) => {
    e.stopPropagation()
    setLoadingId(album.id)
    try {
      const res = await fetch('/api/albums', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: album.id, status: 'declined' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error ?? 'Gagal decline')
        return
      }
      await fetchAlbums(true)
    } finally {
      setLoadingId(null)
    }
  }

  const handleInvite = async (album: AlbumRow) => {
    const albumId = album.id
    if (!albumId) return

    if (album.type === 'yearbook' && (album.status ?? 'pending') !== 'approved') {
      alert('Album yearbook harus disetujui dulu sebelum bisa mengundang teman.')
      return
    }

    setInviteLoading(albumId)
    try {
      const res = await fetch(`/api/albums/${albumId}/invite`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error ?? 'Gagal membuat link undangan')
        return
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const link = data.inviteLink ?? `${origin}/join/${data.token}`
      const code = data.token ?? ''
      setInviteModal({ link, code, albumName: album.name })
    } catch {
      alert('Gagal membuat link undangan')
    } finally {
      setInviteLoading(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, album: AlbumRow) => {
    e.stopPropagation()
    if (!confirm('Yakin ingin menghapus?')) return
    setLoadingId(album.id)
    try {
      const res = await fetch('/api/albums', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: album.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error ?? 'Gagal hapus')
        return
      }
      await fetchAlbums(true)
    } finally {
      setLoadingId(null)
    }
  }

  const handlePay = async (album: AlbumRow) => {
    if (album.payment_url) {
      setInvoicePopupUrl(album.payment_url)
      return
    }

    setLoadingId(album.id)
    try {
      const res = await fetch(`/api/albums/${album.id}/checkout`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error ?? 'Gagal memproses pembayaran')
        return
      }
      if (data.invoiceUrl) {
        setInvoicePopupUrl(data.invoiceUrl)
        fetchAlbums(true) // Refresh data untuk simpan payment_url
      }
    } catch {
      alert('Gagal memproses pembayaran')
    } finally {
      setLoadingId(null)
    }
  }

  const handleRowClick = (album: AlbumRow) => {
    const destinationUrl = album.type === 'public'
      ? `${linkBasePath}/album/public/${album.id}`
      : `${linkBasePath}/album/yearbook/${album.album_id ?? album.id}`
    router.push(destinationUrl)
  }

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
      const res = await fetch(`/api/albums/invite/${encodeURIComponent(token)}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const albumId = data?.albumId
        if (albumId) {
          router.push(`${linkBasePath}/album/yearbook/${albumId}`)
        } else {
          fetchAlbums(true)
          setInviteLinkInput('')
        }
        return
      }
      if (type === 'code' && res.status === 404) {
        const checkRes = await fetch(`/api/albums/invite/${encodeURIComponent(token)}`, { credentials: 'include' })
        if (checkRes.ok) {
          router.push(`/invite/${token}`)
          return
        }
      }
      setJoinError(typeof data?.error === 'string' ? data.error : 'Gagal bergabung.')
    } catch {
      setJoinError('Gagal bergabung. Coba lagi.')
    } finally {
      setJoinLoading(false)
    }
  }

  const title = isAdmin ? 'Manajemen Album' : 'Album Saya'
  const subtitle = isAdmin ? 'Kelola status dan data album.' : 'Daftar album Anda.'
  const showroomHref = resolvedLinkContext === 'admin' ? '/admin/showroom' : '/user/showroom'
  const publicCreateHref = resolvedLinkContext === 'admin' ? '/admin/album/public/create' : '/user/portal/album/public/create'

  return (
    <div>
      {invoicePopupUrl && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-[#0a0a0b]" role="dialog" aria-modal="true" aria-label="Invoice pembayaran">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
            <h3 className="text-sm font-semibold text-white">Invoice Pembayaran Album</h3>
            <button
              type="button"
              onClick={() => setInvoicePopupUrl(null)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <iframe
              src={invoicePopupUrl}
              title="Invoice Xendit"
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              allow="payment"
            />
          </div>
        </div>
      )}

      {/* Mobile first: header stack, lalu row di desktop */}
      <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-xl font-bold text-app sm:text-2xl">{title}</h1>
          <p className="text-muted text-xs mt-0.5 sm:text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-row gap-2">
          <button
            type="button"
            onClick={() => setConfirmModal('personal')}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] touch-manipulation transition-transform"
            title="Buat Personal"
          >
            <ImagePlus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmModal('yearbook')}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 active:scale-[0.98] touch-manipulation transition-transform"
            title="Order Yearbook"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Yearbook</span>
          </button>
        </div>
      </div>

      {/* Kotak: Cari + Kode undangan — flex row di desktop */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 min-w-0 flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Cari nama, kota, paket..."
            className="flex-1 min-w-0 bg-transparent text-sm text-app placeholder:text-muted focus:outline-none h-8 leading-normal"
          />
        </div>

        {/* Undang Teman */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:w-[400px]">
          <input
            type="text"
            value={inviteLinkInput}
            onChange={(e) => { setInviteLinkInput(e.target.value); setJoinError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenInviteLink()}
            placeholder="Masukan kode undangan"
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-app placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/50 min-h-[44px]"
          />
          <button
            type="button"
            onClick={handleOpenInviteLink}
            disabled={joinLoading}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 min-h-[44px]"
          >
            {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {joinLoading ? 'Memproses...' : 'Gabung'}
          </button>
        </div>
        {joinError && <p className="text-xs text-red-400 absolute mt-12">{joinError}</p>}
      </div>

      {loading ? (
        isAdmin ? (
          <>
            <div className="md:hidden grid grid-cols-1 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-white/10 rounded-xl p-4 bg-white/[0.02] animate-pulse space-y-3">
                  <div className="h-5 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-8 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
            <div className="hidden md:block bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden animate-pulse">
              <div className="h-10 bg-white/5 border-b border-white/5 w-full" />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center px-4 py-4 border-b border-white/5 gap-4">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/5 rounded w-1/6" />
                  <div className="h-4 bg-white/5 rounded w-1/6 hidden sm:block" />
                  <div className="h-4 bg-white/5 rounded w-1/6 hidden md:block" />
                  <div className="h-8 w-8 bg-white/5 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col h-full bg-white/[0.02] animate-pulse min-h-[160px]">
                <div className="flex-grow">
                  <div className="space-y-2 mb-3">
                    <div className="h-6 bg-white/10 rounded-md w-3/4" />
                    <div className="h-4 bg-white/5 rounded-md w-1/2" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <div className="h-6 w-20 bg-white/5 rounded-full" />
                    <div className="h-6 w-24 bg-white/5 rounded-full" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-2">
                  <div className="h-3 bg-white/5 rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-12 sm:py-16 border border-white/10 rounded-xl bg-white/[0.02]">
          <h3 className="text-base font-semibold text-app sm:text-lg">
            {albums.length === 0 ? (isAdmin ? 'Belum ada data' : 'Belum ada album') : 'Tidak ada hasil'}
          </h3>
          <p className="text-muted text-sm mt-2">
            {albums.length === 0 ? 'Buat Personal atau Order Yearbook dari Showroom.' : 'Coba kata kunci lain.'}
          </p>
        </div>
      ) : isAdmin ? (
        <>
          {/* Mobile: kartu dengan nama, paket, kota, WA, estimasi, status + tombol simetris */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {paginatedAlbums.map((album) => {
              const isProcessing = loadingId === album.id
              const destUrl = album.type === 'public'
                ? `/admin/album/public/${album.id}`
                : `/admin/album/yearbook/${album.album_id ?? album.id}`
              const estimasi = album.total_estimated_price
                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(album.total_estimated_price)
                : '-'
              return (
                <div key={album.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold text-app break-words">{album.name}</p>
                    <p className="text-muted"><span className="text-muted/80">Paket:</span> {album.pricing_packages?.name?.replace(/^Paket\s+/i, '') || '-'}</p>
                    <p className="text-muted"><span className="text-muted/80">Kota:</span> {album.school_city || '-'}</p>
                    <p className="text-muted"><span className="text-muted/80">WA:</span> {album.wa_e164 || '-'}</p>
                    <p className="text-muted"><span className="text-muted/80">Estimasi:</span> {estimasi}</p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${(album.status ?? 'pending') === 'approved' ? 'bg-green-500/20 text-green-400' :
                        (album.status ?? 'pending') === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          (album.status ?? 'pending') === 'declined' ? 'bg-red-500/20 text-red-400' :
                            'bg-sky-500/20 text-sky-400'
                        }`}>
                      {album.status ?? 'pending'}
                    </span>
                    {album.type === 'yearbook' && (album.status ?? 'pending') === 'approved' && (
                      <span
                        className={`inline-block ml-2 px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${album.payment_status === 'paid' ? 'bg-lime-500/20 text-lime-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {album.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10">
                    <Link
                      href={destUrl}
                      className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 border border-transparent"
                    >
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    {album.type === 'yearbook' && (album.status ?? 'pending') !== 'approved' && (
                      <button
                        type="button"
                        disabled={!!loadingId}
                        onClick={(e) => { e.preventDefault(); handleApprove(e as any, album) }}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 border border-transparent"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                      </button>
                    )}
                    {album.type === 'yearbook' && (album.status ?? 'pending') !== 'declined' && (
                      <button
                        type="button"
                        disabled={!!loadingId}
                        onClick={(e) => { e.preventDefault(); handleDecline(e as any, album) }}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 border border-transparent"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!loadingId}
                      onClick={(e) => { e.preventDefault(); handleDelete(e as any, album) }}
                      className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium rounded-lg bg-red-600/80 text-white hover:bg-red-700 disabled:opacity-50 border border-transparent"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop: tabel */}
          <div className="hidden md:block bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider w-1/3">Sekolah / Nama</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Paket</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Kota</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">PIC</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">WA</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden xl:table-cell">Siswa</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider hidden xl:table-cell">Total Est.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {paginatedAlbums.map((album) => {
                    const isProcessing = loadingId === album.id
                    return (
                      <tr
                        key={album.id}
                        onClick={() => handleRowClick(album)}
                        className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-app">
                          <div className="flex flex-col">
                            <span className="break-words line-clamp-2">{album.name}</span>
                            {album.type === 'public' && <span className="text-xs text-sky-400">Personal</span>}
                            <span className="text-xs text-muted sm:hidden mt-1">
                              {[album.school_city, album.pic_name].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                          {album.pricing_packages?.name?.replace(/^Paket\s+/i, '') || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted hidden sm:table-cell whitespace-nowrap">
                          {album.school_city || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted hidden md:table-cell whitespace-nowrap">{album.pic_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted hidden lg:table-cell whitespace-nowrap">{album.wa_e164 || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted hidden xl:table-cell whitespace-nowrap">{album.students_count || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted hidden xl:table-cell whitespace-nowrap">
                          {album.total_estimated_price
                            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(album.total_estimated_price)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${(album.status ?? 'pending') === 'approved' ? 'bg-green-500/20 text-green-400' :
                              (album.status ?? 'pending') === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                (album.status ?? 'pending') === 'declined' ? 'bg-red-500/20 text-red-400' :
                                  'bg-sky-500/20 text-sky-400'
                              }`}>
                            {album.status ?? 'pending'}
                          </span>
                          {album.type === 'yearbook' && (album.status ?? 'pending') === 'approved' && (
                            <span
                              className={`inline-block ml-1.5 px-2 py-0.5 mt-1 sm:mt-0 lg:block lg:ml-0 lg:mt-1 xl:inline-block xl:ml-1.5 xl:mt-0 text-[10px] sm:text-xs font-semibold rounded-full ${album.payment_status === 'paid' ? 'bg-lime-500/20 text-lime-400' : 'bg-orange-500/20 text-orange-400'}`}>
                              {album.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {album.type === 'yearbook' && (
                              <>
                                {(album.status ?? 'pending') !== 'approved' && (
                                  <button
                                    onClick={(e) => handleApprove(e, album)}
                                    disabled={!!loadingId}
                                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                                    title="Approve"
                                  >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  </button>
                                )}
                                {(album.status ?? 'pending') !== 'declined' && (
                                  <button
                                    onClick={(e) => handleDecline(e, album)}
                                    disabled={!!loadingId}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                                    title="Decline"
                                  >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, album)}
                              disabled={!!loadingId}
                              className="p-1.5 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 disabled:opacity-50 transition-colors"
                              title="Hapus"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedAlbums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              variant={variant}
              basePath={linkBasePath}
              pathname={pathname}
              onApprove={isAdmin ? (e) => handleApprove(e as any, album) : undefined}
              onDecline={isAdmin ? (e) => handleDecline(e as any, album) : undefined}
              onDelete={isAdmin ? (e) => handleDelete(e as any, album) : undefined}
              onInvite={!isAdmin ? handleInvite : undefined}
              onPay={!isAdmin ? handlePay : undefined}
              loadingId={loadingId ?? inviteLoading}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredAlbums.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
          <p className="text-xs text-muted">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, filteredAlbums.length)} dari {filteredAlbums.length} entri
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-app hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Sebelumnya
            </button>
            <div className="flex items-center px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 rounded-lg text-app">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-app hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Modal konfirmasi buat Personal / Yearbook — UI custom, bukan dialog browser */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
          <div className="bg-app border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-app font-medium mb-4">
              {confirmModal === 'personal' ? 'Mau buat personal?' : 'Mau buat yearbook?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-app hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal === 'personal') router.push(publicCreateHref)
                  else router.push(showroomHref)
                  setConfirmModal(null)
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${confirmModal === 'personal' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInviteModal(null)}>
          <div className="bg-app border border-white/10 rounded-xl p-4 sm:p-5 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-app mb-1">Undangan — {inviteModal.albumName}</h3>
            <p className="text-xs text-muted mb-3">Bagikan kode ini; penerima bisa masukkan kode di halaman Album.</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-mono font-semibold text-app tracking-wide px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                {inviteModal.code}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteModal.code)
                  setCopyFeedback(true)
                  setTimeout(() => setCopyFeedback(false), 2000)
                }}
                className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 min-w-[72px]"
              >
                {copyFeedback ? 'Tersalin!' : 'Salin kode'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInviteModal(null)}
              className="w-full py-2 text-sm font-medium rounded-lg border border-white/10 text-app hover:bg-white/5 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
