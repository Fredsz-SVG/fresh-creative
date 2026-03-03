'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { User, Users, Eye, ClipboardPaste, ExternalLink } from 'lucide-react'
import AlbumsView from '@/components/albums/AlbumsView'

export default function AdminAlbumsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [previewInput, setPreviewInput] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const tabFromUrl = useMemo(() => {
    const fromQuery = searchParams.get('tab')
    if (fromQuery === 'mine' || fromQuery === 'manage') return fromQuery
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('adminAlbumsTab')
      if (saved === 'mine' || saved === 'manage') return saved
    }
    return 'manage'
  }, [searchParams])
  const [activeTab, setActiveTab] = useState<'mine' | 'manage'>(tabFromUrl)
  const lastUrlTabRef = useRef<'mine' | 'manage'>(tabFromUrl)

  useEffect(() => {
    if (tabFromUrl !== lastUrlTabRef.current) {
      lastUrlTabRef.current = tabFromUrl
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const setTab = (tab: 'mine' | 'manage') => {
    setActiveTab(tab)
    lastUrlTabRef.current = tab
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminAlbumsTab', tab)
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  /** Parse album ID from a preview link or raw UUID */
  const parsePreviewAlbumId = (input: string): string | null => {
    const trimmed = input.trim()
    if (!trimmed) return null
    // UUID pattern
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    // Try URL first
    try {
      if (trimmed.startsWith('http')) {
        const url = new URL(trimmed)
        const match = url.pathname.match(/\/album\/([^/]+)/)
        if (match) return match[1]
      }
    } catch { /* ignore */ }
    // Check if raw UUID
    const uuidMatch = trimmed.match(uuidPattern)
    if (uuidMatch) return uuidMatch[0]
    return null
  }

  const handleOpenPreview = () => {
    setPreviewError(null)
    const albumId = parsePreviewAlbumId(previewInput)
    if (!albumId) {
      setPreviewError('Masukkan link preview atau Album ID yang valid.')
      return
    }
    router.push(`/album/${albumId}/preview`)
    setPreviewInput('')
  }

  const handlePastePreview = async () => {
    setPreviewError(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text) setPreviewInput(text)
    } catch {
      setPreviewError('Tidak bisa membaca clipboard. Tempel manual.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 bg-[#0a0a0b] md:static md:mx-0 md:px-0">
        <div className="w-full max-w-md mx-auto">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setTab('mine')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'mine'
                  ? 'bg-lime-500 text-black'
                  : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Album Saya
            </button>
            <button
              type="button"
              onClick={() => setTab('manage')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'bg-lime-500 text-black'
                  : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Manajemen Album
            </button>
          </div>
        </div>
      </div>

      {/* Public Preview Link Bar */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 relative">
        <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-2">
          <Eye className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Link Preview Publik
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={previewInput}
            onChange={(e) => { setPreviewInput(e.target.value); setPreviewError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenPreview()}
            placeholder="Tempel link preview atau Album ID"
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-app placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/50 min-h-[44px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePastePreview}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors min-h-[44px]"
              title="Tempel dari clipboard"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span className="sm:hidden">Tempel</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPreview}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Buka Preview
            </button>
          </div>
        </div>
        {previewError && <p className="text-xs text-red-400 mt-2">{previewError}</p>}
      </div>

      <div className={activeTab === 'mine' ? 'block' : 'hidden'}>
        <AlbumsView variant="user" linkContext="admin" fetchUrl="/api/albums?scope=mine" active={activeTab === 'mine'} />
      </div>
      <div className={activeTab === 'manage' ? 'block' : 'hidden'}>
        <AlbumsView variant="admin" linkContext="admin" active={activeTab === 'manage'} />
      </div>
    </div>
  )
}
