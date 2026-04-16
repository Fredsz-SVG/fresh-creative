'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { User, Users } from 'lucide-react'
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
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="relative inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
          <div
            className={`absolute top-1 bottom-1 rounded-xl bg-violet-400 transition-all duration-300 ease-out ${
              activeTab === 'mine' ? 'left-1 w-[calc(50%-6px)]' : 'left-1 w-[calc(50%-6px)]'
            }`}
            style={{
              transform: activeTab === 'mine' ? 'translateX(0)' : 'translateX(100%)',
              width: 'calc(50% - 6px)',
            }}
          />
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'mine'
                ? 'text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" strokeWidth={2.5} />
            <span>Album Saya</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('manage')}
            className={`relative z-10 flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'manage'
                ? 'text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={2.5} />
            <span>Manajemen</span>
          </button>
        </div>
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