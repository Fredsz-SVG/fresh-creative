'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Check, Loader2, X, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'
import { asObject, asString, getErrorMessage } from '@/components/yearbook/utils/response-narrowing'

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

  // Resolve token -> albumId
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
    fetchWithAuth(`/api/albums/invite/${token}`)
      .then((res) => res.json())
      .then((result) => {
        const parsed = asObject(result)
        const inviteError = asString(parsed.error)
        if (inviteError) throw new Error(inviteError)
        setResolvedAlbumId(asString(parsed.albumId) ?? null)
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
        const authResult = await supabase.auth.getUser()
        const currentUser = authResult.data.user
        if (!currentUser) {
          toast.error('Silakan login terlebih dahulu untuk mendaftar')
          router.push(`/login?next=${encodeURIComponent(loginReturnPath ?? defaultReturnPath)}`)
          return
        }
        setUser(currentUser)

        const [checkRes, albumRes, statsRes] = await Promise.all([
          fetchWithAuth(`/api/albums/${albumId}/check-user`, { cache: 'no-store' }),
          fetchWithAuth(`/api/albums/${albumId}/public`, { cache: 'no-store' }),
          fetchWithAuth(`/api/albums/${albumId}/join-stats`, { cache: 'no-store' }),
        ])

        if (checkRes.ok) {
          const checkData = asObject(await checkRes.json().catch(() => ({})))
          if (checkData.hasRequest) {
            if (checkData.status === 'pending') {
              toast.error('Anda sudah mendaftar dan menunggu persetujuan')
              setTimeout(() => router.push('/user'), 2000)
              return
            }
            if (checkData.status === 'approved') {
              toast.error('Anda sudah terdaftar dan disetujui')
              setTimeout(() => router.push('/user'), 2000)
              return
            }
          }
        }

        if (albumRes.ok) {
          const albumData = asObject(await albumRes.json().catch(() => ({})))
          setAlbumInfo(albumData)
          if (albumData.classes && Array.isArray(albumData.classes)) {
            setAlbumClasses(albumData.classes as { id: string; name: string; sort_order?: number }[])
          }
        } else {
          toast.error('Album tidak ditemukan')
          setTimeout(() => router.push('/'), 2000)
          return
        }

        if (statsRes.ok) {
          const statsData = asObject(await statsRes.json().catch(() => ({})))
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
      const res = await fetchWithAuth(`/api/albums/${resolvedAlbumId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = asObject(await res.json().catch(() => ({})))

      if (!res.ok) {
        toast.error(getErrorMessage(data, 'Gagal mendaftar'))
        return
      }

      toast.success(asString(data.message) || 'Pendaftaran berhasil!')
      setSuccess(true)
      setTimeout(() => router.push('/user'), 2000)
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (inviteError) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 overflow-hidden transition-colors duration-500">
        <div className="text-center p-8 bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-white rounded-[2rem] shadow-[8px_8px_0_0_#000] dark:shadow-[#a3e635] max-w-sm w-full">
          <p className="font-general text-red-600 dark:text-red-400 font-black mb-6 uppercase tracking-tight">
            {inviteError === 'Invite expired'
              ? 'Link undangan sudah kadaluarsa.'
              : 'Undangan tidak valid atau tidak ditemukan.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-4 rounded-2xl bg-yellow-300 text-black border-2 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 overflow-hidden transition-colors duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-slate-900 dark:border-white border-t-lime-500 animate-spin rounded-full shadow-[4px_4px_0_0_#000] dark:shadow-[#a3e635]" />
          <p className="font-general font-black uppercase tracking-widest text-slate-900 dark:text-white">Memuat Data...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="fixed inset-0 h-[100dvh] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 overflow-hidden transition-colors duration-500">
        <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-[10px_10px_0_0_#000] dark:shadow-[#a3e635]">
          <div className="w-20 h-20 bg-lime-400 border-4 border-slate-900 dark:border-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#000] -rotate-3 transition-transform hover:rotate-0">
            <Check className="w-10 h-10 text-slate-900" strokeWidth={4} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">Pendaftaran Berhasil!</h1>
          <p className="text-slate-600 dark:text-slate-400 font-bold mb-8 leading-relaxed">
            Pendaftaran Anda telah diterima. Tunggu konfirmasi dari admin untuk bergabung ke album.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-4 rounded-2xl bg-lime-400 text-slate-900 border-4 border-slate-900 font-black uppercase tracking-widest shadow-[6px_6px_0_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            Beranda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 h-[100dvh] bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col transition-colors duration-500">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-none flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 max-w-md w-full relative my-auto shadow-[10px_10px_0_0_#000] dark:shadow-[10px_10px_0_0_#a3e635]">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 p-1.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-lg text-slate-900 dark:text-white hover:bg-red-400 dark:hover:bg-red-500 transition-colors shadow-[2px_2px_0_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </button>
          )}

          <div className="mb-5 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tighter leading-tight pr-8">
              {albumInfo?.name || 'Daftar Album'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold leading-tight">
              {albumInfo?.description || 'Silakan lengkapi data diri Anda.'}
            </p>

            {stats && stats.limit_count > 0 && (
              <div className="mt-3 flex items-center">
                 <div className="px-2.5 py-0.5 bg-cyan-400 border-2 border-slate-900 dark:border-white rounded-lg shadow-[2px_2px_0_0_#000] -rotate-1">
                   <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">
                     {stats.approved_count}/{stats.limit_count} Terdaftar
                   </span>
                 </div>
                {stats.available_slots <= 0 && (
                  <span className="ml-3 text-red-600 dark:text-red-400 font-black animate-pulse uppercase text-[10px]">Penuh!</span>
                )}
              </div>
            )}
          </div>

          {stats && stats.available_slots <= 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 dark:text-red-400 font-black mb-4 uppercase tracking-widest text-xs">Maaf, Album ini sudah penuh!</p>
              <button
                onClick={() => (onClose ? onClose() : router.push('/'))}
                className="w-full px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-black font-black uppercase shadow-[3px_3px_0_0_#000]"
              >
                Kembali
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  placeholder="Nama Lengkap"
                  className="w-full px-4 py-2.5 text-sm font-bold border-[3px] border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:shadow-[4px_4px_0_0_#22c55e] dark:focus:shadow-[#22c55e] transition-all rounded-xl"
                  required
                />
              </div>

              <div className="min-w-0 relative z-[50]">
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                  Kelas <span className="text-red-500">*</span>
                </label>
                {albumClasses.length > 0 ? (
                  <>
                    <input type="hidden" name="class_name" value={formData.class_name} required />
                    <button
                      type="button"
                      onClick={() => setClassDropdownOpen((o) => !o)}
                      className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-sm font-black border-[3px] border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:shadow-[4px_4px_0_0_#22c55e] transition-all"
                    >
                      <span className="truncate">{formData.class_name || '-- PILIH KELAS --'}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={3} />
                    </button>
                    {classDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[90] bg-black/5" onClick={() => setClassDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 top-full z-[100] mt-1 w-full rounded-xl bg-white dark:bg-slate-800 border-[3px] border-slate-900 dark:border-white overflow-hidden">
                          <ul className="max-h-52 overflow-y-auto no-scrollbar p-1.5">
                            {albumClasses.map((cls) => (
                              <li key={cls.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((p) => ({ ...p, class_name: cls.name }))
                                    setClassDropdownOpen(false)
                                  }}
                                  className="w-full text-left px-4 py-3 text-sm font-black text-slate-900 dark:text-white hover:bg-lime-400 dark:hover:bg-lime-400 hover:text-black transition-colors uppercase tracking-tight rounded-lg mb-1 last:mb-0 min-h-[44px]"
                                >
                                  {cls.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="XII IPA 1"
                    className="w-full px-4 py-2.5 text-sm font-bold border-[3px] border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:shadow-[4px_4px_0_0_#22c55e] transition-all rounded-xl"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-[10]">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-2.5 text-sm font-bold border-[3px] border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:shadow-[4px_4px_0_0_#22c55e] transition-all rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                    No. WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08123xxx"
                    className="w-full px-4 py-2.5 text-sm font-bold border-[3px] border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:shadow-[4px_4px_0_0_#22c55e] transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 sm:h-14 mt-2 rounded-xl bg-lime-400 text-slate-900 border-[3px] border-slate-900 dark:border-white font-black uppercase text-sm sm:text-base tracking-widest shadow-[5px_5px_0_0_#000] dark:shadow-[5px_5px_0_0_#a3e635] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Daftar Sekarang
                    <Check className="w-5 h-5 transition-transform group-hover:scale-125" strokeWidth={4} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
