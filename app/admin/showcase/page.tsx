'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth } from '../../../lib/api-client'
import { toast } from 'sonner'
import { Loader2, Eye, BookOpen, Save, ExternalLink } from 'lucide-react'

export default function AdminShowcasePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [albumCarouselLink, setAlbumCarouselLink] = useState('')
  const [flipbookPreviewUrl, setFlipbookPreviewUrl] = useState('')

  const fetchShowcase = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/admin/showcase')
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const list = Array.isArray(data.albumPreviews) ? data.albumPreviews : []
        setAlbumCarouselLink(list[0]?.link ? String(list[0].link) : '')
        setFlipbookPreviewUrl(typeof data.flipbookPreviewUrl === 'string' ? data.flipbookPreviewUrl : '')
      } else {
        toast.error(data?.error || 'Gagal memuat pengaturan preview')
      }
    } catch {
      toast.error('Gagal memuat pengaturan preview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShowcase()
  }, [fetchShowcase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/admin/showcase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumPreviews: albumCarouselLink.trim() ? [{ title: '', imageUrl: '', link: albumCarouselLink.trim() }] : [],
          flipbookPreviewUrl: flipbookPreviewUrl.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Pengaturan preview berhasil disimpan.')
        fetchShowcase()
      } else {
        toast.error(data?.error || 'Gagal menyimpan')
      }
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-4xl pb-12">
        <div className="space-y-2 mb-8">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-64" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {[1, 2].map(i => (
            <div key={i} className="rounded-3xl border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155]">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-2" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-4 max-w-[85%]" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl pb-12">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
          Showcase Configuration
        </h1>
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base max-w-2xl">
          Atur contoh preview album dan flipbook yang ditampilkan di halaman <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">/user</span>. Ini adalah data demo publik yang bisa diklik oleh user baru.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Flipbook Preview */}
        <div className="rounded-3xl border-4 border-slate-900 dark:border-slate-700 bg-emerald-50 dark:bg-slate-800 p-6 md:p-8 shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-16 h-16 text-emerald-300 dark:text-emerald-900" />
          </div>
          <div className="relative">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Preview Flipbook
            </h3>
            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Link publik flipbook (tanpa login). Gunakan format: <br />
              <code className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">/album/[album-id]/flipbook</code>
            </p>
            <div className="relative">
              <input
                type="text"
                value={flipbookPreviewUrl}
                onChange={(e) => setFlipbookPreviewUrl(e.target.value)}
                placeholder="/album/uuid/flipbook"
                className="w-full px-5 py-4 text-sm font-bold rounded-2xl bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-900 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
              />
            </div>
          </div>
        </div>

        {/* Album Carousel Preview */}
        <div className="rounded-3xl border-4 border-slate-900 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 p-6 md:p-8 shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Eye className="w-16 h-16 text-sky-300 dark:text-sky-900" />
          </div>
          <div className="relative">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview Album
            </h3>
            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Link publik preview album (tanpa login). Gunakan format: <br />
              <code className="text-sky-700 dark:text-sky-300 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-700">/album/[album-id]/preview</code>
            </p>
            <div className="relative">
              <input
                type="text"
                value={albumCarouselLink}
                onChange={(e) => setAlbumCarouselLink(e.target.value)}
                placeholder="/album/uuid/preview"
                className="w-full px-5 py-4 text-sm font-bold rounded-2xl bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-sky-200 dark:focus:ring-sky-900 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-indigo-400 dark:bg-indigo-700 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 text-base font-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Simpan Pengaturan
        </button>
      </div>
    </div>
  )
}
