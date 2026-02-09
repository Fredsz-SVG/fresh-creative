'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'

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

  // Fetch stats on mount
  useState(() => {
    if (albumId) {
      fetch(`/api/albums/${albumId}/join-stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(() => {})
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.student_name || !formData.email) {
      toast.error('Nama dan email wajib diisi')
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
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-3xl font-bold text-white mb-2">Daftar Album Yearbook</h1>
          <p className="text-gray-400">Isi form di bawah untuk bergabung</p>
          
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
                Kelas
              </label>
              <input
                type="text"
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                placeholder="Contoh: XII IPA 1"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
              />
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
