'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  X,
  Bell,
  User,
  Home,
  Sparkles,
  History,
  Coins,
  type LucideIcon,
} from 'lucide-react'
import TopUpModal from './TopUpModal'
import { supabase } from '@/lib/supabase'

export type NavSection = {
  title: string
  items: { href: string; label: string; icon: LucideIcon; badge?: string }[]
}

type DashboardShellProps = {
  logoHref: string
  sectionTitle: string
  navSections: NavSection[]
  userDisplayName?: string
  userBadge?: string
  userEmail?: string
  onLogout?: () => void
  children: React.ReactNode
}

export default function DashboardShell({
  logoHref,
  sectionTitle,
  navSections,
  userDisplayName,
  userBadge,
  userEmail,
  onLogout,
  children,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showTopUp, setShowTopUp] = useState(false)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    let channel: any

    const init = async () => {
      try {
        const res = await fetch('/api/user/me')
        const data = await res.json()
        if (typeof data.credits === 'number') setCredits(data.credits)

        if (data.id) {
          channel = supabase
            .channel('realtime-credits')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users'
              },
              (payload: any) => {
                if (payload.new && typeof payload.new.credits === 'number') {
                  setCredits(payload.new.credits)
                }
              }
            )
            .subscribe()
        }
      } catch (e) {
        // ignore
      }
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Di mobile, sembunyikan header saat salah satu fitur AI Labs (Try On, Pose, Image Editor, Photo Group, Photo to Video) dibuka
  const isAiLabsFeaturePage = useMemo(() => {
    const segments = ['tryon', 'pose', 'image-editor', 'photogroup', 'phototovideo']
    return segments.some((s) => pathname.endsWith('/' + s))
  }, [pathname])

  // Halaman album yearbook (sampul/detail): full screen tanpa header, sidebar, dan bottom nav
  const isYearbookAlbumPage = useMemo(() => {
    return /\/album\/yearbook\/[^/]+$/.test(pathname)
  }, [pathname])

  // Derive bottom nav items for mobile (app-like): Home, Labs, Album, Riwayat Transaksi
  const bottomNavItems = useMemo(() => {
    const sections = Array.isArray(navSections) ? navSections : []
    const mainSection = sections[0]
    const aiLabsSection = sections.find((s) => s?.title === 'AI Labs')
    const mainFirst = mainSection?.items?.[0]
    const labsFirst = aiLabsSection?.items?.[0]
    const allItems = sections.flatMap((s) => s?.items ?? [])
    const albumItem = allItems.find((i) => i?.label === 'Album')
    const riwayatItem = allItems.find((i) => i?.label === 'Riwayat Transaksi')

    return [
      mainFirst && { href: mainFirst.href, label: 'Home', icon: Home },
      albumItem && { href: albumItem.href, label: 'Album', icon: albumItem.icon },
      labsFirst && { href: labsFirst.href, label: 'Labs', icon: Sparkles },
      riwayatItem && { href: riwayatItem.href, label: 'Riwayat', icon: History },
    ].filter(Boolean) as { href: string; label: string; icon: LucideIcon }[]
  }, [navSections])

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-2 min-h-[32px] px-2.5 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation ${isActive
      ? 'bg-lime-500/20 text-lime-400'
      : 'text-gray-400 hover:bg-white/5 hover:text-white active:bg-white/10'
    }`

  const NavSections = () => (
    <>
      {(Array.isArray(navSections) ? navSections : []).map((section) => {
        if (!section?.items?.length) return null
        return (
          <div key={section.title} className="space-y-0.5">
            <p className="px-2.5 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={navLinkClass(isActive)}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-lime-400' : 'text-gray-500'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] text-gray-500">({item.badge})</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </>
  )

  const NavFooter = () => (
    <div className="p-2 border-t border-white/10">
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 min-h-[32px]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
          {(userDisplayName || userEmail || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white truncate">{userDisplayName || 'User'}</p>
          {userBadge && <p className="text-[10px] text-purple-400 truncate">{userBadge}</p>}
        </div>
      </div>
      {onLogout && (
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(false)
            onLogout()
          }}
          className="mt-1.5 w-full min-h-[32px] px-2.5 py-2 rounded-lg text-left text-xs font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors touch-manipulation"
        >
          Logout
        </button>
      )}
    </div>
  )

  if (isYearbookAlbumPage) {
    return (
      <div className="dashboard-shell min-h-[100dvh] bg-[#0a0a0b] text-gray-100">
        {children}
      </div>
    )
  }

  return (
    <div className="dashboard-shell min-h-[100dvh] bg-[#0a0a0b] text-gray-100 flex flex-col">
      {/* Top header - di mobile disembunyikan saat fitur AI Labs (tryon, pose, image-editor, photogroup, phototovideo) dibuka */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-14 min-h-[44px] border-b border-white/10 bg-[#0a0a0b]/95 backdrop-blur flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] ${isAiLabsFeaturePage ? 'max-md:hidden' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={logoHref}
            className="flex items-center gap-2 text-lime-400 font-bold uppercase tracking-wider text-sm shrink-0 min-h-[44px]"
          >
            <Zap className="w-5 h-5 shrink-0" />
            <span className="inline">FRESHCREATIVE.ID</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-2 text-white/90 text-sm font-medium uppercase tracking-wide truncate ml-1">
            {sectionTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Credit Display */}
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="flex flex-col items-end mr-2 md:mr-4 group cursor-pointer"
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 group-hover:text-lime-400 transition-colors">Credit</p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-white group-hover:text-lime-400 transition-colors">
              <Coins className="w-3.5 h-3.5 text-lime-400" />
              <span>{credits}</span>
            </div>
          </button>
          <div className="hidden md:block text-right mr-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Status</p>
            <p className={`text-xs font-medium ${isOnline ? 'text-lime-400' : 'text-red-500'}`}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          {/* Notification icon removed per request */}
          {onLogout && (
            // show person icon only on mobile; desktop hides it
            <button
              type="button"
              onClick={() => {
                // on mobile open drawer; desktop action not needed because icon hidden
                if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
                  setDrawerOpen(true)
                } else {
                  onLogout()
                }
              }}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors touch-manipulation"
              aria-label="Profile / Menu"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer overlay - z-50 agar di atas bottom nav (z-40) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer - slide from left; z-50 agar di atas bottom nav */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[60] w-[min(260px,88vw)] max-w-full
          bg-[#0a0a0b] border-r border-white/10
          flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-out
          md:hidden
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <span className="text-sm font-semibold text-white uppercase tracking-wide">Menu</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            <NavSections />
          </div>
          <div className="shrink-0 border-t border-white/10">
            <NavFooter />
          </div>
        </nav>
      </aside>

      {/* Desktop sidebar - hidden on mobile; menu scroll bila banyak, footer tetap di bawah */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 z-30 w-56 lg:w-64 border-r border-white/10 bg-[#0a0a0b] flex-col">
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-2">
          <NavSections />
        </nav>
        <div className="shrink-0 border-t border-white/10">
          <NavFooter />
        </div>
      </aside>

      {/* Main content - mobile first: padding bawah untuk fixed bottom nav + safe area */}
      <main
        className={`flex-1 w-full md:pb-8 md:pl-56 lg:pl-64 ${isAiLabsFeaturePage ? 'max-md:pt-0 max-md:pb-8 pt-14 pb-[5.5rem]' : 'pt-14 pb-[5.5rem] md:pb-20'}`}
        style={{ paddingBottom: isAiLabsFeaturePage ? undefined : 'max(5.5rem, calc(4rem + env(safe-area-inset-bottom)))' }}
      >
        <div className="min-h-full p-4 sm:p-5 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation - fixed seperti aplikasi mobile; z-40 agar di bawah sidebar saat drawer buka */}
      {bottomNavItems.length > 0 && (
        <nav
          className={`fixed bottom-0 left-0 right-0 z-40 md:hidden min-h-[4rem] pt-2 border-t border-white/10 bg-[#0a0a0b] flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] ${isAiLabsFeaturePage ? 'max-md:hidden' : ''}`}
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[3rem] py-2 rounded-xl
                  transition-colors touch-manipulation active:scale-95
                  ${isActive ? 'text-lime-400' : 'text-gray-500 hover:text-gray-300 active:text-white'}
                `}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
      {/* TopUp Modal */}
      <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} currentCredit={credits} />
    </div>
  )
}