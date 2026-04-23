'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fetchWithAuth } from '../../../lib/api-client'
import { Loader2, Eye, BookOpen, Save, MessageCircle, Plus, Trash2, Edit2, Upload, GripVertical, ImageIcon, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { convertToWebP } from '../../../lib/image-conversion'

interface PortfolioItem {
  id: string
  title: string
  subtitle: string
  description: string
  image_url: string
  display_order: number
}

type ActiveTab = 'ebook' | 'phygital' | 'portfolio'

export default function AdminShowcasePage() {
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<'flipbook' | 'album' | 'fonnte' | null>(null)
  const [albumCarouselLink, setAlbumCarouselLink] = useState('')
  const [flipbookPreviewUrl, setFlipbookPreviewUrl] = useState('')
  const [fonnteTarget, setFonnteTarget] = useState('')
  const [statusBanner, setStatusBanner] = useState<string | null>(null)
  const hasCacheRef = React.useRef(false)
  const albumInputRef = useRef<HTMLInputElement | null>(null)
  const flipbookInputRef = useRef<HTMLInputElement | null>(null)
  const fonnteInputRef = useRef<HTMLInputElement | null>(null)

  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loadingPortfolio, setLoadingPortfolio] = useState(true)
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null)
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Portfolio Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const VALID_TABS: ActiveTab[] = ['ebook', 'phygital', 'portfolio']

  const getTabFromHash = (): ActiveTab => {
    if (typeof window === 'undefined') return 'ebook'
    const hash = window.location.hash.replace('#', '') as ActiveTab
    return VALID_TABS.includes(hash) ? hash : 'ebook'
  }

  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabFromHash)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  const cacheKey = 'admin_showcase_v1'
  const portfolioCacheKey = 'admin_portfolio_v1'
  const hasCachePortfolioRef = React.useRef(false)

  // Instant render from cache to avoid skeleton when switching sidebar (before paint).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    // Showcase cache
    try {
      const raw = window.sessionStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: { albumCarouselLink: string; flipbookPreviewUrl: string; target: string } }
        if (parsed?.data) {
          setAlbumCarouselLink(parsed.data.albumCarouselLink || '')
          setFlipbookPreviewUrl(parsed.data.flipbookPreviewUrl || '')
          setFonnteTarget(parsed.data.target || '')
          setLoading(false)
          hasCacheRef.current = true
        }
      }
    } catch { /* ignore */ }
    // Portfolio cache
    try {
      const raw = window.sessionStorage.getItem(portfolioCacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as PortfolioItem[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPortfolio(parsed)
          setLoadingPortfolio(false)
          hasCachePortfolioRef.current = true
        }
      }
    } catch { /* ignore */ }
  }, [])

  const fetchShowcase = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetchWithAuth('/api/admin/showcase')
      const data = (await res.json().catch(() => ({}))) as unknown
      if (res.ok) {
        const obj = (data && typeof data === 'object' && !Array.isArray(data) ? (data as any) : {}) as any
        const list = Array.isArray(obj.albumPreviews) ? obj.albumPreviews : []
        const albumLink = list[0]?.link ? String(list[0].link) : ''
        const flipbookLink = typeof obj.flipbookPreviewUrl === 'string' ? obj.flipbookPreviewUrl : ''
        const target = typeof obj.target === 'string' ? obj.target : ''
        setAlbumCarouselLink(albumLink)
        setFlipbookPreviewUrl(flipbookLink)
        setFonnteTarget(target)
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: { albumCarouselLink: albumLink, flipbookPreviewUrl: flipbookLink, target } }))
          } catch {
            // ignore
          }
        }
      } else {
        const err = (data && typeof data === 'object' && !Array.isArray(data) ? (data as any).error : undefined) as string | undefined
        setStatusBanner(`error: ${err || 'Gagal memuat pengaturan preview'}`)
        setTimeout(() => setStatusBanner(null), 3000)
      }
    } catch {
      setStatusBanner('error: Gagal memuat pengaturan preview')
      setTimeout(() => setStatusBanner(null), 3000)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShowcase(hasCacheRef.current)
  }, [fetchShowcase])

  const fetchPortfolio = useCallback(async (silent = false) => {
    if (!silent) setLoadingPortfolio(true)
    try {
      const res = await fetchWithAuth('/api/admin/portfolio')
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setPortfolio(list)
        try {
          window.sessionStorage.setItem(portfolioCacheKey, JSON.stringify(list))
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Fetch portfolio error:', e)
    } finally {
      setLoadingPortfolio(false)
    }
  }, [])

  useEffect(() => {
    fetchPortfolio(hasCachePortfolioRef.current)
  }, [fetchPortfolio])

  // Realtime Sync Listener - Durable Objects & WebSocket
  useEffect(() => {
    const onRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; channel?: string; payload?: Record<string, unknown> }>).detail
      if (!detail?.type || detail.channel !== 'global') return

      const path = typeof detail.payload?.path === 'string' ? detail.payload.path : ''

      if (path.startsWith('/api/admin/portfolio') || path.startsWith('/api/portfolio')) {
        fetchPortfolio(true)
      }
      if (path.startsWith('/api/admin/showcase')) {
        fetchShowcase(true)
      }
    }

    window.addEventListener('fresh:realtime', onRealtime)
    return () => window.removeEventListener('fresh:realtime', onRealtime)
  }, [fetchPortfolio, fetchShowcase])

  const handleSaveSection = async (section: 'flipbook' | 'album' | 'fonnte') => {
    const latestAlbumLink = (albumInputRef.current?.value ?? albumCarouselLink).trim()
    const latestFlipbookLink = (flipbookInputRef.current?.value ?? flipbookPreviewUrl).trim()
    const latestFonnteTarget = (fonnteInputRef.current?.value ?? fonnteTarget).trim()
    // Keep state synced with actual input DOM values before sending.
    setAlbumCarouselLink(latestAlbumLink)
    setFlipbookPreviewUrl(latestFlipbookLink)
    setFonnteTarget(latestFonnteTarget)

    setSavingSection(section)
    setStatusBanner(`saving-${section}`)
    try {
      const res = await fetchWithAuth('/api/admin/showcase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumPreviews: latestAlbumLink ? [{ title: '', imageUrl: '', link: latestAlbumLink }] : [],
          flipbookPreviewUrl: latestFlipbookLink,
          target: latestFonnteTarget,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as unknown
      if (res.ok) {
        setStatusBanner(`save-${section}-success`)
        await fetchShowcase(true)
        setTimeout(() => setStatusBanner(null), 3000)
      } else {
        const err = (data && typeof data === 'object' && !Array.isArray(data) ? (data as any).error : undefined) as string | undefined
        setStatusBanner(`error: ${err || 'Gagal menyimpan'}`)
        setTimeout(() => setStatusBanner(null), 3000)
      }
    } catch {
      setStatusBanner('error: Gagal menyimpan')
      setTimeout(() => setStatusBanner(null), 3000)
    } finally {
      setSavingSection(null)
    }
  }

  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setIsSavingPortfolio(true)
    try {
      const formData = new FormData()
      if (editingItem.id) formData.append('id', editingItem.id)
      formData.append('title', editingItem.title || '')
      formData.append('subtitle', editingItem.subtitle || '')
      formData.append('description', editingItem.description || '')
      formData.append('displayOrder', String(editingItem.display_order || 0))
      formData.append('imageUrl', editingItem.image_url || '')

      const file = fileInputRef.current?.files?.[0]
      if (file) {
        try {
          const webpBlob = await convertToWebP(file)
          formData.append('image', webpBlob, `${editingItem.title?.replace(/\s+/g, '_') || 'portfolio'}.webp`)
        } catch (webpErr) {
          console.error('WebP conversion failed, using original:', webpErr)
          formData.append('image', file)
        }
      }

      const url = editingItem.id ? `/api/admin/portfolio/${editingItem.id}` : '/api/admin/portfolio'
      const method = editingItem.id ? 'PUT' : 'POST'

      const res = await fetchWithAuth(url, {
        method,
        body: formData, // fetchWithAuth will handle multipart if body is FormData
      })

      if (res.ok) {
        setStatusBanner(editingItem.id ? 'Portfolio updated' : 'Portfolio created')
        setEditingItem(null)
        await fetchPortfolio()
        setTimeout(() => setStatusBanner(null), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal menyimpan portfolio')
      }
    } catch (e) {
      alert('Error saving portfolio')
    } finally {
      setIsSavingPortfolio(false)
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetchWithAuth(`/api/admin/portfolio/${itemToDelete}`, { method: 'DELETE' })
      if (res.ok) {
        setStatusBanner('Portfolio dihapus-success')
        setTimeout(() => setStatusBanner(null), 3000)
        await fetchPortfolio()
        setItemToDelete(null)
      }
    } catch (e) {
      setStatusBanner('error: Gagal menghapus portfolio')
      setTimeout(() => setStatusBanner(null), 3000)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl pb-12">
      {statusBanner && (
        <div className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] max-w-[90%] md:max-w-md w-full px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[#64748b] dark:shadow-[4px_4px_0_0_#1e293b] md:shadow-[4px_4px_0_0_#334155] dark:md:shadow-[4px_4px_0_0_#334155] transform transition-all animate-bounce-subtle ${statusBanner.startsWith('error:') ? 'bg-red-400 dark:bg-red-600 text-white' : statusBanner.endsWith('-success') ? 'bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white' : 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white'}`}>
          <div className="flex items-center gap-2 md:gap-3 font-bold text-xs md:text-sm">
            {statusBanner.startsWith('saving-') ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : null}
            {statusBanner === 'saving-flipbook' ? 'Menyimpan View flipbook...' :
              statusBanner === 'saving-album' ? 'Menyimpan View album...' :
                statusBanner === 'saving-fonnte' ? 'Menyimpan target Fonnte...' :
                  statusBanner === 'save-flipbook-success' ? 'View flipbook berhasil disimpan.' :
                    statusBanner === 'save-album-success' ? 'View album berhasil disimpan.' :
                      statusBanner === 'save-fonnte-success' ? 'Target Fonnte berhasil disimpan.' :
                statusBanner.startsWith('error: ') ? `Error: ${statusBanner.replace('error: ', '')}` : statusBanner}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            View Settings
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
            Atur elemen publik yang ditampilkan di landing page dan halaman user.
          </p>
        </div>

        {activeTab === 'portfolio' && !editingItem && (
          <button
            onClick={() => {
              setEditingItem({ id: '', title: '', subtitle: '', description: '', display_order: portfolio.length, image_url: '' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-5 py-3 bg-violet-500 text-white rounded-2xl text-sm font-bold hover:bg-violet-600 transition-all shadow-[4px_4px_0_0_#2e1065] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none animate-in fade-in zoom-in-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Portfolio
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-900 dark:border-slate-800 w-fit relative">
        {(['ebook', 'phygital', 'portfolio'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`relative flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-colors duration-300 z-10 ${
              activeTab === tab
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white dark:bg-slate-800 shadow-[3px_3px_0_0_#0f172a] border border-slate-900 rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">
              {tab === 'ebook' && <BookOpen className="w-3.5 h-3.5" />}
              {tab === 'phygital' && <MessageCircle className="w-3.5 h-3.5" />}
              {tab === 'portfolio' && <ImageIcon className="w-3.5 h-3.5" />}
              {tab === 'ebook' ? 'Ebook' : tab === 'phygital' ? 'Phygital' : 'Portfolio'}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-4 max-w-[85%]" />
                <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab === 'ebook' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Flipbook View */}
          <div className="rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-16 h-16 text-emerald-300 dark:text-emerald-900" />
            </div>
            <div className="relative">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                View Flipbook
              </h3>
              <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Link publik flipbook (tanpa login). Gunakan format: <br />
                <code className="text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">/album/[album-id]/flipbook</code>
              </p>
              <div className="relative">
                <input
                  ref={flipbookInputRef}
                  type="text"
                  value={flipbookPreviewUrl}
                  onChange={(e) => setFlipbookPreviewUrl(e.target.value)}
                  placeholder="/album/uuid/flipbook"
                  className="w-full px-5 py-4 text-sm font-bold rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-900 transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] focus:shadow-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSaveSection('flipbook')}
                disabled={savingSection !== null}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-400 dark:bg-emerald-700 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 text-sm font-bold hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] transition-all disabled:opacity-50"
              >
                {savingSection === 'flipbook' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Flipbook
              </button>
            </div>
          </div>

          {/* Album Carousel View */}
          <div className="rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Eye className="w-16 h-16 text-sky-300 dark:text-sky-900" />
            </div>
            <div className="relative">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Album
              </h3>
              <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Link View album (tanpa login). Gunakan format: <br />
                <code className="text-sky-700 dark:text-sky-300 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-700">/album/[album-id]/view</code>
              </p>
              <div className="relative">
                <input
                  ref={albumInputRef}
                  type="text"
                  value={albumCarouselLink}
                  onChange={(e) => setAlbumCarouselLink(e.target.value)}
                  placeholder="/album/uuid/view"
                  className="w-full px-5 py-4 text-sm font-bold rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-sky-200 dark:focus:ring-sky-900 transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] focus:shadow-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSaveSection('album')}
                disabled={savingSection !== null}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-400 dark:bg-sky-700 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 text-sm font-bold hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] transition-all disabled:opacity-50"
              >
                {savingSection === 'album' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Album
              </button>
            </div>
          </div>
            </div>
          )}

          {activeTab === 'phygital' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Fonnte WhatsApp Target */}
              <div className="rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-green-50 dark:bg-slate-800 p-6 md:p-8 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] relative overflow-hidden group max-w-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MessageCircle className="w-16 h-16 text-green-300 dark:text-green-900" />
                </div>
                <div className="relative">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Fonnte WhatsApp Target
                  </h3>
                  <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    Nomor WhatsApp penerima notifikasi saat user mengisi form Cetak Fisik. Format: <br />
                    <code className="text-green-700 dark:text-green-300 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-700">62xxxxxxxxxx</code>
                  </p>
                  <div className="relative">
                    <input
                      ref={fonnteInputRef}
                      type="text"
                      value={fonnteTarget}
                      onChange={(e) => setFonnteTarget(e.target.value)}
                      placeholder="6285865913347"
                      className="w-full px-5 py-4 text-sm font-bold rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-green-200 dark:focus:ring-green-900 transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] focus:shadow-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSection('fonnte')}
                    disabled={savingSection !== null}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-green-400 dark:bg-green-700 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 text-sm font-bold hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] transition-all disabled:opacity-50"
                  >
                    {savingSection === 'fonnte' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Target
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {editingItem && (
              <div className="mb-10 p-6 md:p-8 rounded-3xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[8px_8px_0_0_#2e1065] animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSavePortfolioItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Judul Portfolio</label>
                      <input
                        type="text"
                        required
                        value={editingItem.title || ''}
                        onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                        placeholder="Contoh: American 90s"
                        className="w-full px-5 py-3.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sub-judul / Konsep</label>
                      <input
                        type="text"
                        required
                        value={editingItem.subtitle || ''}
                        onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                        placeholder="Contoh: Retro & Nostalgic"
                        className="w-full px-5 py-3.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Deskripsi Singkat</label>
                      <textarea
                        required
                        rows={3}
                        value={editingItem.description || ''}
                        onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                        placeholder="Ceritakan tentang konsep portfolio ini..."
                        className="w-full px-5 py-3.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-900 transition-all resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Urutan Tampil</label>
                        <input
                          type="number"
                          value={editingItem.display_order ?? 0}
                          onChange={e => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) || 0 })}
                          className="w-full px-5 py-3.5 text-sm font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cover Photo</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden group cursor-pointer hover:border-violet-400 transition-all"
                      >
                        {editingItem.image_url ? (
                          <>
                            <img src={editingItem.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <Upload className="w-10 h-10 mb-2" />
                            <p className="text-xs font-bold">Klik untuk upload foto</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => setEditingItem({ ...editingItem, image_url: reader.result as string })
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="flex-1 px-5 py-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPortfolio}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-violet-500 text-white border-2 border-slate-900 dark:border-slate-700 font-bold shadow-[4px_4px_0_0_#2e1065] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
                      >
                        {isSavingPortfolio ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Menyimpan...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            <span>{editingItem.id ? 'Simpan Perubahan' : 'Tambah Portfolio'}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Paginated Content */}
                {(() => {
                  const totalPages = Math.ceil(portfolio.length / ITEMS_PER_PAGE)
                  const currentItems = portfolio.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

                  return (
                    <>
                      {currentItems.map((p) => (
                        <div key={p.id} className="group relative rounded-3xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-[6px_6px_0_0_#334155] dark:shadow-[6px_6px_0_0_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_#334155] transition-all">
                          <div className="aspect-[4/5] relative">
                            <img src={p.image_url} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
                            <div className="absolute inset-x-0 bottom-0 p-6">
                              <p className="text-[10px] font-black text-lime-400 uppercase tracking-[0.2em] mb-1">{p.subtitle}</p>
                              <h4 className="text-lg font-black text-white leading-tight">{p.title}</h4>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                              <button 
                                onClick={() => {
                                  setEditingItem(p);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-3 bg-white text-slate-900 rounded-2xl shadow-xl hover:bg-violet-500 hover:text-white transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setItemToDelete(p.id)}
                                className="p-3 bg-white text-rose-500 rounded-2xl shadow-xl hover:bg-rose-500 hover:text-white transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute top-4 left-4">
                              <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-bold text-white">
                                #{p.display_order}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                })()}

                {loadingPortfolio && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] rounded-3xl border-2 border-slate-200 dark:border-slate-800 animate-pulse bg-slate-50 dark:bg-slate-900" />
                ))}
              </div>

              {/* Pagination Controls */}
              {portfolio.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-4 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold disabled:opacity-30 hover:bg-slate-50 transition-all"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Page {currentPage} of {Math.ceil(portfolio.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    disabled={currentPage === Math.ceil(portfolio.length / ITEMS_PER_PAGE)}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-4 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold disabled:opacity-30 hover:bg-slate-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-5 md:p-6 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
            >
              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Hapus Portfolio?</h3>
              <p className="mt-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Aksi ini tidak bisa dibatalkan. Data portfolio yang dipilih akan dihapus permanen.
              </p>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-900 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-rose-400 text-rose-900 rounded-xl font-bold hover:bg-rose-300 transition-all shadow-[2px_2px_0_0_#e11d48] hover:shadow-none disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

