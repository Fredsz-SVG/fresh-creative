'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2, X, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export type AlbumRegisterFormProps = {
  /** Langsung pakai albumId (halaman /register/[id]) */
  albumId?: string
  /** Atau pakai token undangan; form akan resolve ke albumId dulu (satu loading) */
  token?: string
  /** URL untuk redirect setelah login (mis. /invite/token atau /register/id) */
  loginReturnPath?: string
  /** Jika ada, tampilkan tombol X untuk tutup/kembali */
  onClose?: () => void
}

export default function AlbumRegisterForm({ albumId: albumIdProp, token, loginReturnPath, onClose }: AlbumRegisterFormProps) {
  const router = useRouter()
  const [resolvedAlbumId, setResolvedAlbumId] = useState<string | null>(albumIdProp ?? null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const defaultReturnPath = resolvedAlbumId ? `/register/${resolvedAlbumId}` : '/register'

  const [formData, setFormData] = useState({
    student_name: '',
    class_name: '',
    email: '',
    phone: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [albumInfo, setAlbumInfo] = useState<any>(null)
  const [albumClasses, setAlbumClasses] = useState<{ id: string; name: string; sort_order?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false)

  // Resolve token -> albumId (invite flow), satu loading dengan langkah berikutnya
  useEffect(() => {
    if (albumIdProp) {
      setResolvedAlbumId(albumIdProp)
      return
    }
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setInviteError(null)
    fetch(`/api/albums/invite/${token}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) throw new Error(result.error)
        setResolvedAlbumId(result.albumId)
      })
      .catch((err) => {
        setInviteError(err.message)
        setLoading(false)
      })
  }, [albumIdProp, token])

  useEffect(() => {
    const albumId = resolvedAlbumId
    if (!albumId) return

    const checkAuthAndFetchData = async () => {
      try {
        // Auth + data album paralel supaya form muncul lebih cepat
        const [authResult, checkRes, albumRes, statsRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch(`/api/albums/${albumId}/check-user`, { cache: 'no-store' }),
          fetch(`/api/albums/${albumId}/public`, { cache: 'no-store' }),
          fetch(`/api/albums/${albumId}/join-stats`, { cache: 'no-store' })
        ])

        const currentUser = authResult.data.user
        if (!currentUser) {
          toast.error('Silakan login terlebih dahulu untuk mendaftar')
          router.push(`/login?next=${encodeURIComponent(loginReturnPath ?? defaultReturnPath)}`)
          return
        }
        setUser(currentUser)

        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData.hasRequest) {
            if (checkData.status === 'pending') {
              toast.error('Anda sudah mendaftar dan menunggu persetujuan')
              setTimeout(() => router.push('/user/portal'), 2000)
              return
            }
            if (checkData.status === 'approved') {
              toast.error('Anda sudah terdaftar dan disetujui')
              setTimeout(() => router.push('/user/portal'), 2000)
              return
            }
          }
        }

        if (albumRes.ok) {
          const albumData = await albumRes.json()
          setAlbumInfo(albumData)
          if (albumData.classes && Array.isArray(albumData.classes)) {
            setAlbumClasses(albumData.classes)
          }
        } else {
          toast.error('Album tidak ditemukan')
          setTimeout(() => router.push('/'), 2000)
          return
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Gagal memuat data album')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchData()
  }, [resolvedAlbumId, loginReturnPath, defaultReturnPath, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.student_name || !formData.email) {
      toast.error('Nama dan email wajib diisi')
      return
    }
    if (albumClasses.length > 0 && !formData.class_name) {
      toast.error('Kelas wajib dipilih')
      return
    }
    if (!formData.phone?.trim()) {
      toast.error('No. WhatsApp wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/albums/${resolvedAlbumId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Gagal mendaftar')
        return
      }

      toast.success(data.message || 'Pendaftaran berhasil!')
      setSuccess(true)
      setTimeout(() => router.push('/user/portal'), 2000)
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (inviteError) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 overflow-hidden">
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">
            {inviteError === 'Invite expired'
              ? 'Link undangan sudah kadaluarsa.'
              : 'Undangan tidak valid atau tidak ditemukan.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 overflow-hidden">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-lime-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-lime-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Pendaftaran Berhasil!</h1>
          <p className="text-gray-400 mb-6">
            Pendaftaran Anda telah diterima. Tunggu konfirmasi dari admin untuk bergabung ke album.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-xl bg-lime-600 text-white font-medium hover:bg-lime-500 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 h-[100dvh] bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-none flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full min-w-0 relative my-auto overflow-visible">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">{albumInfo?.name || 'Daftar Album Yearbook'}</h1>
          <p className="text-gray-400 text-sm">{albumInfo?.description || 'Isi form di bawah untuk bergabung'}</p>

          {stats && stats.limit_count > 0 && (
            <div className="mt-2 sm:mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-lime-600/20 border border-lime-500/30 text-sm">
              <span className="text-lime-400 font-medium">
                {stats.approved_count}/{stats.limit_count} siswa terdaftar
              </span>
              {stats.available_slots <= 0 && (
                <span className="text-red-400 text-xs">(Penuh)</span>
              )}
            </div>
          )}
        </div>

        {stats && stats.available_slots <= 0 ? (
          <div className="text-center py-4 sm:py-6">
            <p className="text-red-400 mb-3 text-sm">Maaf, album ini sudah penuh.</p>
            <button
              onClick={() => (onClose ? onClose() : router.push('/'))}
              className="px-4 py-2 rounded-xl bg-gray-700 text-white text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Kembali
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
            </div>

            <div className="min-w-0 relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                Kelas <span className="text-red-400">*</span>
              </label>
              {albumClasses.length > 0 ? (
                <>
                  <input type="hidden" name="class_name" value={formData.class_name} required />
                  <button
                    type="button"
                    onClick={() => setClassDropdownOpen((o) => !o)}
                    className="w-full min-w-0 max-w-full text-left px-3 pr-8 py-2 sm:px-4 sm:pr-10 sm:py-2.5 text-sm rounded-lg sm:rounded-xl bg-gray-900 border border-white/10 text-white focus:outline-none focus:border-lime-500 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{formData.class_name || '-- Pilih Kelas --'}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {classDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden onClick={() => setClassDropdownOpen(false)} />
                      <ul className="absolute left-0 right-0 top-full z-[11] mt-1 w-full max-w-full rounded-lg sm:rounded-xl bg-gray-900 border border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                        {albumClasses.map((cls) => (
                          <li key={cls.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({ ...p, class_name: cls.name }))
                                setClassDropdownOpen(false)
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 truncate block"
                            >
                              {cls.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="Contoh: XII IPA 1"
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                No. WhatsApp <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08123456789"
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-lime-600 text-white text-sm font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}
