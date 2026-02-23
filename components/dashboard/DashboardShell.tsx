'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  const [showNotifications, setShowNotifications] = useState(false)
  // Credits state
  const [credits, setCredits] = useState(0)

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (typeof window !== 'undefined' && !navigator.onLine) return
    try {
      const res = await fetch('/api/user/notifications')
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data && Array.isArray(data)) {
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
    } catch (e) {
      // Ignored: Server might be restarting or network drop
    }
  }

  useEffect(() => {
    let channel: any

    fetchNotifications() // initial fetch

    const init = async () => {
      try {
        const res = await fetch('/api/user/me')
        const data = await res.json()
        if (typeof data.credits === 'number') setCredits(data.credits)

        if (data.id) {
          channel = supabase
            .channel(`user-realtime-${data.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${data.id}`
              },
              (payload: any) => {
                if (payload.new && typeof payload.new.credits === 'number') {
                  setCredits(payload.new.credits)
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${data.id}`
              },
              () => {
                fetchNotifications()
              }
            )
            .subscribe()
        }
      } catch (e) {
        // ignore
      }
    }

    init()

    const onCreditsUpdated = () => {
      fetch('/api/user/me')
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.credits === 'number') setCredits(data.credits)
        })
        .catch(() => {})
    }
    window.addEventListener('credits-updated', onCreditsUpdated)

    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('credits-updated', onCreditsUpdated)
    }
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))

      await fetch(`/api/user/notifications/${id}`, { method: 'PATCH' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      await fetch('/api/user/notifications', { method: 'PATCH' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  const handleClearNotifications = async () => {
    if (!confirm('Hapus semua notifikasi?')) return
    try {
      setNotifications([])
      setUnreadCount(0)
      await fetch('/api/user/notifications', { method: 'DELETE' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  // Handle click outside notifications
  const notificationRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showNotifications) return

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])


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

  // Halaman album yearbook (sampul atau section kelas/preview/dll): full screen tanpa header, sidebar, dan bottom nav
  const isYearbookAlbumPage = useMemo(() => {
    return /\/album\/yearbook\/[^/]+(\/[^/]+)?$/.test(pathname ?? '')
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
          {/* Notification - Updated per user request */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors touch-manipulation"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-[#0a0a0b] animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed left-1/2 -translate-x-1/2 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] w-[calc(100vw-2rem)] max-w-sm md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:translate-x-0 md:absolute bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Notifikasi</h3>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-[10px] text-gray-500">{unreadCount} baru</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-lime-400 hover:text-lime-300 transition-colors"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearNotifications}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-gray-500 mb-2">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkRead(n.id)}
                          className={`p-3 hover:bg-white/5 transition-colors cursor-pointer border-l-2 ${n.is_read ? 'border-transparent opacity-60' : 'border-lime-500 bg-white/[0.02]'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-lime-500/20 text-lime-400'}`}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-xs font-semibold text-white leading-tight truncate">{n.title}</p>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-lime-500 shrink-0 mt-1" />}
                              </div>
                              <div className="text-[11px] text-gray-400 space-y-0.5 whitespace-pre-line">
                                {n.message}
                              </div>
                              {n.metadata?.status && (
                                <p className="text-[10px] text-lime-400 font-medium pt-1">{n.metadata.status}</p>
                              )}
                              <p className="text-[9px] text-gray-600 pt-1">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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