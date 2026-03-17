'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { User, Users, Eye, ClipboardPaste, ExternalLink } from 'lucide-react'
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


  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-black border-2 sm:border-4 border-slate-900 dark:border-slate-700 transition-all ${activeTab === 'mine'
            ? 'bg-violet-400 text-slate-900 shadow-[3px_3px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] sm:dark:shadow-[4px_4px_0_0_#334155]'
            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none'
            }`}
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="whitespace-nowrap">Album Saya</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('manage')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-base font-black border-2 sm:border-4 border-slate-900 dark:border-slate-700 transition-all ${activeTab === 'manage'
            ? 'bg-violet-400 text-slate-900 shadow-[3px_3px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] sm:dark:shadow-[4px_4px_0_0_#334155]'
            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-none'
            }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="whitespace-nowrap">Manajemen Album</span>
        </button>
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
