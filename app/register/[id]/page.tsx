'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Check, Loader2, AlertCircle, ArrowRight, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AlbumJoinPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params?.id as string

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

  // Check auth and fetch album info on mount
  useEffect(() => {
    if (!albumId) return

    const checkAuthAndFetchData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
          // User not logged in, redirect to login with return URL
          toast.error('Silakan login terlebih dahulu untuk mendaftar')
          router.push(`/login?next=/register/${albumId}`)
          return
        }

        setUser(currentUser)

        // Check if user already has a request for this album
        const checkRes = await fetch(`/api/albums/${albumId}/check-user`, {
          cache: 'no-store'
        })

        if (checkRes.ok) {
          const checkData = await checkRes.json()

          if (checkData.hasRequest) {
            if (checkData.status === 'pending') {
              toast.error('Anda sudah mendaftar dan menunggu persetujuan')
              setTimeout(() => router.push('/user/portal'), 2000)
              return
            } else if (checkData.status === 'approved') {
              toast.error('Anda sudah terdaftar dan disetujui')
              setTimeout(() => router.push('/user/portal'), 2000)
              return
            }
            // If rejected, allow to continue (re-register)
          }
        }

        // Fetch album basic info (public endpoint, no auth required)
        const albumRes = await fetch(`/api/albums/${albumId}/public`, {
          cache: 'no-store'
        })

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

        // Fetch registration stats
        const statsRes = await fetch(`/api/albums/${albumId}/join-stats`, {
          cache: 'no-store'
        })

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
  }, [albumId, router])

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

    setSubmitting(true)
    try {
      const res = await fetch(`/api/albums/${albumId}/join-requests`, {
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

      // Redirect to user portal after 2 seconds
      setTimeout(() => {
        router.push('/user/portal')
      }, 2000)
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-lime-500/10 to-[#0a0a0b] pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm space-y-6">
          <div className="w-24 h-24 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-lime-500 animate-in zoom-in duration-500">
            <Check className="w-12 h-12 text-lime-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">Berhasil!</h1>
            <p className="text-gray-400 leading-relaxed px-4">
              Pendaftaran Anda telah terkirim. Tunggu kabar baik dari admin segera.
            </p>
          </div>
          <button
            onClick={() => router.push('/user/portal')}
            className="w-full py-4 rounded-2xl bg-white text-black font-black hover:bg-gray-200 transition-all active:scale-95"
          >
            Buka Portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center p-6 selection:bg-lime-500/30">
      {/* Background Decorative */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-lime-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md pt-8 sm:pt-16 flex flex-col items-center text-center">
        {/* Album Avatar Header (WhatsApp/Telegram Style) */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl bg-gray-900 group">
            {albumInfo?.cover_image_url ? (
              <img
                src={albumInfo.cover_image_url}
                alt={albumInfo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-lime-500 to-emerald-700 flex items-center justify-center text-5xl">
                🎓
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-lime-500 rounded-2xl flex items-center justify-center border-4 border-[#0a0a0b] shadow-lg">
            <User className="w-5 h-5 text-black" />
          </div>
        </div>

        <div className="space-y-1 mb-10">
          <h1 className="text-2xl font-black tracking-tight">{albumInfo?.name || 'Yearbook Album'}</h1>
          <p className="text-gray-400 text-sm font-medium">Lengkapi data untuk bergabung</p>
        </div>

        {/* Info Stats Pills */}
        {stats && stats.limit_count > 0 && (
          <div className="mb-10 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
            {stats.approved_count} / {stats.limit_count} Siswa Terdaftar
          </div>
        )}

        {stats && stats.available_slots <= 0 ? (
          <div className="w-full bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 font-bold mb-6">Pendaftaran sudah penuh</p>
            <button onClick={() => router.push('/')} className="w-full py-4 text-white border border-white/10 rounded-2xl">Kembali</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="bg-white/5 border border-white/5 p-1 rounded-[2.5rem] flex flex-col gap-1 shadow-sm">
              <input
                type="text"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="Nama Lengkap"
                className="w-full px-6 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none border-b border-white/5 focus:border-lime-500/50 transition-colors"
                required
              />
              <div className="relative">
                {albumClasses.length > 0 ? (
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-6 py-5 bg-transparent text-white focus:outline-none appearance-none cursor-pointer border-b border-white/5 focus:border-lime-500/50 transition-colors"
                    required
                  >
                    <option value="" disabled className="bg-[#0a0a0b]">Pilih Kelas</option>
                    {albumClasses.map((cls) => (
                      <option key={cls.id} value={cls.name} className="bg-[#0a0a0b]">
                        {cls.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="Kelas (contoh: XII IPA 1)"
                    className="w-full px-6 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none border-b border-white/5 focus:border-lime-500/50 transition-colors"
                    required
                  />
                )}
                {albumClasses.length > 0 && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email Aktif"
                className="w-full px-6 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none border-b border-white/5 focus:border-lime-500/50 transition-colors"
                required
              />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nomor WhatsApp"
                className="w-full px-6 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none rounded-b-[2rem]"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full group py-5 rounded-[2rem] bg-lime-500 text-black font-black text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(132,204,22,0.25)] flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Daftar Sekarang</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-60">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-white/10">
              <span className="text-[10px] font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs font-medium truncate max-w-[150px]">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push(`/login?next=/register/${albumId}`))}
              className="text-[10px] bg-white/5 px-2 py-1 rounded-md border border-white/10 text-gray-400 hover:text-white"
            >
              Ganti Akun
            </button>
          </div>
          <p className="text-[10px] text-gray-600 font-medium tracking-tight">
            Powered by FRESHCREATIVEID
          </p>
        </div>
      </div>
    </div>
  )
}
