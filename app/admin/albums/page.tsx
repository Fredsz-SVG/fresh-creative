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

      <div className={activeTab === 'mine' ? 'block' : 'hidden'}>
        <AlbumsView variant="user" linkContext="admin" fetchUrl="/api/albums?scope=mine" active={activeTab === 'mine'} />
      </div>
      <div className={activeTab === 'manage' ? 'block' : 'hidden'}>
        <AlbumsView variant="admin" linkContext="admin" active={activeTab === 'manage'} />
      </div>
    </div>
  )
}
