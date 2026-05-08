'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus, User, Users } from 'lucide-react'
import AlbumsView from '@/components/albums/AlbumsView'

export default function AdminAlbumsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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

  const [showCreatePopup, setShowCreatePopup] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* Header Title & Subtitle */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
          {activeTab === 'mine' ? 'Album Saya' : 'Manajemen Album'}
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          {activeTab === 'mine' ? 'Daftar album Anda.' : 'Kelola semua album yang tersedia.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-6">
        {/* Tab Switcher (Left on Desktop) */}
        <div className="relative flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] w-full sm:w-auto">
          <div
            className={`absolute top-1 bottom-1 rounded-xl bg-violet-400 transition-all duration-300 ease-out`}
            style={{
              left: '4px',
              width: 'calc(50% - 6px)',
              transform: activeTab === 'mine' ? 'translateX(0)' : 'translateX(100%)',
            }}
          />
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'mine'
                ? 'text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" strokeWidth={2.5} />
            <span>Saya</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manage')}
            className={`relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'manage'
                ? 'text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={2.5} />
            <span>Manajemen</span>
          </button>
        </div>

        {/* Create Button (Right on Desktop) */}
        <button
          type="button"
          onClick={() => setShowCreatePopup(true)}
          className="flex items-center justify-center gap-2 w-full sm:w-auto sm:px-6 sm:py-3.5 bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#0f172a] dark:hover:shadow-[2px_2px_0_0_#1e293b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all shrink-0"
          title="Buat Album Baru"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
          <span className="text-sm font-black uppercase tracking-[0.1em]">Buat Album</span>
        </button>
      </div>

      {/* Popup Buat Project */}
      {showCreatePopup && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCreatePopup(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[1.5rem] shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#1e293b] p-6 sm:p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">Buat Project?</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Kamu akan diarahkan ke pemilihan paket untuk memulai.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/showroom')}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-violet-300 dark:bg-violet-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-sm font-black uppercase tracking-wider shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                Gas Lanjut
              </button>
              <button
                type="button"
                onClick={() => setShowCreatePopup(false)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={activeTab === 'mine' ? 'block' : 'hidden'}>
        <AlbumsView variant="user" linkContext="admin" fetchUrl="/api/albums?scope=mine" active={activeTab === 'mine'} hideHeader={true} />
      </div>
      <div className={activeTab === 'manage' ? 'block' : 'hidden'}>
        <AlbumsView variant="admin" linkContext="admin" active={activeTab === 'manage'} hideHeader={true} />
      </div>
    </div>
  )
}






