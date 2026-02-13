'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{albumInfo?.name || 'Daftar Album Yearbook'}</h1>
          <p className="text-gray-400">{albumInfo?.description || 'Isi form di bawah untuk bergabung'}</p>
          
          {stats && stats.limit_count > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-600/20 border border-lime-500/30">
              <span className="text-lime-400 font-medium">
                {stats.approved_count}/{stats.limit_count} siswa terdaftar
              </span>
              {stats.available_slots <= 0 && (
                <span className="text-red-400 text-sm">(Penuh)</span>
              )}
            </div>
          )}
        </div>

        {stats && stats.available_slots <= 0 ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Maaf, album ini sudah penuh.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
            >
              Kembali
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kelas <span className="text-red-400">*</span>
              </label>
              {albumClasses.length > 0 ? (
                <select
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-white/10 text-white focus:outline-none focus:border-lime-500 transition-colors appearance-none cursor-pointer"
                  required
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {albumClasses.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="Contoh: XII IPA 1"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                No. WhatsApp (Opsional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08123456789"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3.5 rounded-xl bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
  )
}
