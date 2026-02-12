'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X, Trash2, UserPlus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
}

export type AlbumsViewProps = {
  variant: 'user' | 'admin'
  initialData?: AlbumRow[]
}

function AlbumCard({
  album,
  variant,
  onApprove,
  onDecline,
  onDelete,
  onInvite,
  loadingId,
}: {
  album: AlbumRow
  variant: 'user' | 'admin'
  onApprove?: (album: AlbumRow) => void
  onDecline?: (album: AlbumRow) => void
  onDelete?: (album: AlbumRow) => void
  onInvite?: (album: AlbumRow) => void
  loadingId?: string | null
}) {
  const isAdmin = variant === 'admin'
  const isClickable = album.type === 'public' || album.status === 'approved'
  const basePath = isAdmin ? '/admin' : '/user/portal'
  const destinationUrl = album.type === 'public'
    ? `${basePath}/album/public/${album.id}`
    : `${basePath}/album/yearbook/${album.album_id ?? album.id}`

  const created = album.created_at ? new Date(album.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const statusLabel = album.type === 'yearbook' ? (album.status ?? 'pending') : 'public'
  const canSeeApproved = isAdmin || album.isOwner === true
  const shouldShowStatus = !(statusLabel === 'approved' && !canSeeApproved)
  const displayStatus = statusLabel as string
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
            {isClickable ? 'Klik untuk buka' : statusLabel === 'pending' ? 'Menunggu persetujuan admin' : statusLabel === 'declined' ? 'Akses dibatasi' : 'Klik untuk buka'}
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

export default function AlbumsView({ variant, initialData }: AlbumsViewProps) {
  const [albums, setAlbums] = useState<AlbumRow[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)
  const [inviteModal, setInviteModal] = useState<{ link: string; albumName: string } | null>(null)
  const router = useRouter() // Add router for navigation

  const fetchAlbums = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/albums', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch albums')
      const data = await res.json()
      setAlbums(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])



  useEffect(() => {
    if (!initialData) {
      fetchAlbums()
    }
  }, [fetchAlbums, initialData])

  useEffect(() => {
    const channel = supabase
      .channel('albums-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, () => {
        fetchAlbums(true) // Silent data update
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAlbums])

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
      setInviteModal({ link, albumName: album.name })
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

  const handleRowClick = (album: AlbumRow) => {
    const basePath = '/admin'
    const destinationUrl = album.type === 'public'
      ? `${basePath}/album/public/${album.id}`
      : `${basePath}/album/yearbook/${album.album_id ?? album.id}`
    router.push(destinationUrl)
  }

  const isAdmin = variant === 'admin'
  const title = isAdmin ? 'Manajemen Album & Approve' : 'Album Saya'
  const subtitle = isAdmin ? 'Edit status (Approve/Decline) dan hapus. Data tampil langsung dari tabel albums.' : 'Daftar album Anda.'
  const showroomHref = isAdmin ? '/admin/showroom' : '/user/showroom'
  const publicCreateHref = isAdmin ? '/admin/album/public/create' : '/user/portal/album/public/create'

  return (
    <div>
      {/* Mobile first: header stack, lalu row di desktop */}
      <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-xl font-bold text-app sm:text-2xl">{title}</h1>
          <p className="text-muted text-xs mt-0.5 sm:text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Link href={publicCreateHref} className="w-full sm:w-auto text-center px-4 py-3 sm:py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 active:bg-sky-800 touch-manipulation">
            + Buat Public Album
          </Link>
          <Link href={showroomHref} className="w-full sm:w-auto text-center px-4 py-3 sm:py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 active:bg-purple-800 touch-manipulation">
            + Order Yearbook
          </Link>
        </div>
      </div>

      {loading ? (
        isAdmin ? (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden animate-pulse">
            {/* Table Header Skeleton */}
            <div className="h-10 bg-white/5 border-b border-white/5 w-full"></div>
            {/* Table Rows Skeleton */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center px-4 py-4 border-b border-white/5 gap-4">
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
                <div className="h-4 bg-white/5 rounded w-1/6"></div>
                <div className="h-4 bg-white/5 rounded w-1/6 hidden sm:block"></div>
                <div className="h-4 bg-white/5 rounded w-1/6 hidden md:block"></div>
                <div className="h-8 w-8 bg-white/5 rounded-full ml-auto"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col h-full bg-white/[0.02] animate-pulse min-h-[160px]">
                <div className="flex-grow">
                  {/* Title & Subtitle */}
                  <div className="space-y-2 mb-3">
                    <div className="h-6 bg-white/10 rounded-md w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded-md w-1/2"></div>
                  </div>

                  {/* Badges (Status & Date) */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <div className="h-6 w-20 bg-white/5 rounded-full"></div>
                    <div className="h-6 w-24 bg-white/5 rounded-full"></div>
                  </div>
                </div>

                {/* Footer (Divider & Action Text) */}
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-2">
                  {/* Mimic center text "Klik untuk buka" */}
                  <div className="h-3 bg-white/5 rounded-full w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : albums.length === 0 ? (
        <div className="text-center py-12 sm:py-16 border-2 border-dashed border-white/10 rounded-xl">
          <h3 className="text-base font-semibold text-app sm:text-lg">{isAdmin ? 'Belum ada data' : 'Belum ada album'}</h3>
          <p className="text-muted text-sm mt-2">Buat Public Album atau Order Yearbook dari Showroom.</p>
        </div>
      ) : isAdmin ? (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
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
                {albums.map((album) => {
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
                          {album.type === 'public' && <span className="text-xs text-sky-400">Public Album</span>}
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
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              variant={variant}
              onApprove={isAdmin ? (e) => handleApprove(e as any, album) : undefined}
              onDecline={isAdmin ? (e) => handleDecline(e as any, album) : undefined}
              onDelete={isAdmin ? (e) => handleDelete(e as any, album) : undefined}
              onInvite={!isAdmin ? handleInvite : undefined}
              loadingId={loadingId ?? inviteLoading}
            />
          ))}
        </div>
      )}

      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setInviteModal(null)}>
          <div className="bg-app border border-white/10 rounded-xl p-4 sm:p-5 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-app mb-2">Link Undangan — {inviteModal.albumName}</h3>
            <p className="text-xs text-muted mb-2">Bagikan link ini ke teman agar bisa bergabung ke album.</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteModal.link}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-app"
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(inviteModal.link); alert('Link disalin!') }}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              >
                Salin
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInviteModal(null)}
              className="mt-3 w-full py-2 text-sm font-medium rounded-lg border border-white/10 text-app hover:bg-white/5"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
