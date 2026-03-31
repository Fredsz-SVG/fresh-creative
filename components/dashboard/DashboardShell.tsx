'use client'

import { useState, useMemo, useEffect, useRef, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  X,
  Bell,
  User,
  Home,
  Sparkles,
  History,
  Coins,
  Trash2,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import TopUpModal from './TopUpModal'
import { supabase } from '@/lib/supabase'
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'
import { ThemeContext } from '@/app/providers/ThemeProvider'

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
  const theme = useContext(ThemeContext)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showTopUp, setShowTopUp] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [bottomNavVisible, setBottomNavVisible] = useState(true)
  // Credits state
  const [credits, setCredits] = useState(0)
  const lastScrollY = useRef(0)
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshCredits = () => {
    fetchWithAuth('/api/user/me')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.credits === 'number') setCredits(data.credits)
      })
      .catch(() => { })
  }

  const fetchNotifications = async () => {
    if (typeof window !== 'undefined' && !navigator.onLine) return
    try {
      const res = await fetchWithAuth('/api/user/notifications')
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
    fetchNotifications() // initial fetch

    const init = async () => {
      try {
        const res = await fetchWithAuth('/api/user/me')
        const data = await res.json()
        if (typeof data.credits === 'number') setCredits(data.credits)
      } catch (e) {
        // ignore
      }
    }

    init()

    const onVisible = () => {
      refreshCredits()
      // Only refresh notifications when drawer is open or page regains focus
      fetchNotifications()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    const onCreditsUpdated = () => {
      fetchWithAuth('/api/user/me')
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.credits === 'number') setCredits(data.credits)
        })
        .catch(() => { })
    }
    window.addEventListener('credits-updated', onCreditsUpdated)

    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('credits-updated', onCreditsUpdated)
    }
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      const notif = notifications.find(n => n.id === id)
      if (notif && !notif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      await fetchWithAuth(`/api/user/notifications/${id}`, { method: 'PATCH' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent marking as read when deleting
    try {
      const notif = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif && !notif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      await fetchWithAuth(`/api/user/notifications/${id}`, { method: 'DELETE' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      await fetchWithAuth('/api/user/notifications', { method: 'PATCH' }).catch(() => { })
    } catch (e) {
      fetchNotifications()
    }
  }

  const handleClearNotifications = async () => {
    if (!confirm('Hapus semua notifikasi?')) return
    try {
      setNotifications([])
      setUnreadCount(0)
      await fetchWithAuth('/api/user/notifications', { method: 'DELETE' }).catch(() => { })
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


  // Theme is now managed by ThemeProvider (supports dark/light toggle)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

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
    const re = new RegExp('/album/yearbook/[^/]+(/[^/]+)?$')
    return re.test(pathname ?? '')
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

  // Bottom nav: sembunyikan saat scroll ke bawah, muncul lagi saat scroll ke atas atau scroll berhenti
  useEffect(() => {
    if (bottomNavItems.length === 0) return
    const scrollThreshold = 60
    const scrollEndDelay = 400

    const handleScroll = () => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0
      const prev = lastScrollY.current
      lastScrollY.current = y

      if (prev !== undefined) {
        if (y > prev && y > scrollThreshold) {
          setBottomNavVisible(false)
        } else if (y < prev) {
          setBottomNavVisible(true)
        }
      }

      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
      scrollEndTimer.current = setTimeout(() => {
        setBottomNavVisible(true)
        scrollEndTimer.current = null
      }, scrollEndDelay)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
    }
  }, [bottomNavItems.length])

  const navLinkClass = (isActive: boolean) =>
    `group flex items-center gap-2.5 min-h-[36px] px-3 py-2 rounded-xl text-[13px] font-black transition-all duration-200 touch-manipulation border-2 border-transparent ${isActive
      ? 'bg-indigo-300 dark:bg-indigo-500/30 border-slate-900 dark:border-white/30 text-slate-900 dark:text-white shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_rgba(255,255,255,0.2)] -translate-y-0.5'
      : 'text-slate-600 dark:text-slate-400 hover:border-slate-900 dark:hover:border-white/30 hover:bg-emerald-300 dark:hover:bg-emerald-500/20 hover:text-slate-900 dark:hover:text-white hover:shadow-[3px_3px_0_0_#0f172a] dark:hover:shadow-[3px_3px_0_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
    }`

  const NavSections = () => (
    <>
      {(Array.isArray(navSections) ? navSections : []).map((section) => {
        if (!section?.items?.length) return null
        return (
          <div key={section.title} className="space-y-0.5">
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
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
                      prefetch
                      onClick={() => setDrawerOpen(false)}
                      className={navLinkClass(isActive)}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] text-slate-800 dark:text-white bg-white dark:bg-slate-700 border border-slate-900 dark:border-white/30 px-1.5 py-0.5 flex items-center rounded-full shadow-[1px_1px_0_0_#0f172a] dark:shadow-none font-black leading-none pt-1">({item.badge})</span>
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
    <div className="p-3 border-t-2 border-slate-900 dark:border-white/20 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-200 dark:bg-orange-500/20 border-2 border-slate-900 dark:border-white/30 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.1)] min-h-[36px]">
        <div className="w-8 h-8 rounded-full bg-emerald-400 dark:bg-emerald-500/40 border-2 border-slate-900 dark:border-white/30 flex items-center justify-center text-slate-900 dark:text-white font-black text-[13px] shrink-0 shadow-[2px_2px_0_0_#0f172a] dark:shadow-none">
          {(userDisplayName || userEmail || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-900 dark:text-white truncate tracking-tight">{userDisplayName || 'User'}</p>
          {userBadge && <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-black truncate">{userBadge}</p>}
        </div>
      </div>
      {onLogout && (
        <button
          type="button"
          onClick={() => {
            setLogoutConfirmOpen(true)
          }}
          className="mt-3 w-full min-h-[36px] px-3 py-2 rounded-xl text-center text-xs font-black text-white bg-red-500 border-2 border-slate-900 dark:border-red-400/50 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_rgba(255,255,255,0.1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none hover:bg-red-400 touch-manipulation transition-all"
        >
          LOGOUT
        </button>
      )}
    </div>
  )

  if (isYearbookAlbumPage) {
    return (
      <div className="dashboard-shell min-h-[100dvh] bg-white dark:bg-slate-950 text-gray-900 dark:text-white transition-colors duration-300">
        {children}
      </div>
    )
  }

  return (
    <div className="dashboard-shell min-h-[100dvh] bg-white dark:bg-slate-950 text-gray-800 dark:text-white flex flex-col transition-colors duration-300">
      {logoutConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[120] p-4"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Logout</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Yakin ingin logout dari akun ini?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false)
                  setDrawerOpen(false)
                  onLogout?.()
                }}
                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-14 min-h-[44px] border-b border-slate-900 dark:border-white/20 bg-white dark:bg-slate-900 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_0_#0f172a] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] transition-colors duration-300 ${isAiLabsFeaturePage ? 'max-md:hidden' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={logoHref}
            className="flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <img
              src="/img/logo.png"
              alt="Fresh Creative"
              className="w-7 h-7 md:w-8 md:h-8 object-contain"
            />
            <span className="text-slate-900 dark:text-white font-black uppercase tracking-wider text-[10px] md:text-[15px]">FRESHCREATIVE.ID</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-black uppercase tracking-widest truncate ml-1">
            {sectionTitle}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1">
          {/* Credit Display - tanpa kotak di mobile */}
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="flex flex-col items-end mr-2 sm:mr-4 group cursor-pointer py-0.5"
          >
            <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-black leading-tight">Credit</p>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
              <Coins className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="text-[11px] sm:text-[15px]">{credits}</span>
            </div>
          </button>

          <div className="hidden md:flex flex-col items-end mr-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-900 dark:text-white font-black">Status</p>
            <p className={`text-[12px] font-black uppercase tracking-tight py-0.5 px-2 rounded-lg border-2 border-slate-900 dark:border-white/30 shadow-[2px_2px_0_0_#0f172a] dark:shadow-none -rotate-1 ${isOnline ? 'bg-emerald-300 dark:bg-emerald-500/30 text-slate-900 dark:text-emerald-400' : 'bg-red-400 text-white'}`}>
              {isOnline ? 'Connected' : 'Offline'}
            </p>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={theme?.toggleTheme}
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white/30 text-slate-900 dark:text-white shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all touch-manipulation mr-2"
            title="Toggle Theme"
          >
            {mounted && (theme?.isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
          </button>
          {/* Notification - tanpa kotak di mobile, lingkaran di desktop */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-full sm:rounded-xl bg-transparent dark:bg-transparent sm:bg-white sm:dark:bg-slate-800 border-0 sm:border-2 border-slate-900 dark:border-white/30 text-slate-900 dark:text-white sm:shadow-[3px_3px_0_0_#0f172a] dark:sm:shadow-[3px_3px_0_0_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:shadow-none transition-all touch-manipulation"
            >
              <Bell className="w-5 h-5" strokeWidth={3} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 min-w-[12px] h-[12px] sm:min-w-[18px] sm:h-[18px] px-0.5 sm:px-1 rounded-full bg-pink-500 border-2 border-slate-900 dark:border-pink-400/50 animate-pulse flex items-center justify-center text-[7px] sm:text-[9px] font-black text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed left-1/2 -translate-x-1/2 top-[calc(4rem+env(safe-area-inset-top))] w-[calc(100vw-2rem)] max-w-sm md:left-auto md:right-0 md:top-full md:mt-4 md:w-80 md:translate-x-0 md:absolute bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-white/20 rounded-3xl shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_rgba(255,255,255,0.05)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b-2 border-slate-900 dark:border-white/20 flex items-center justify-between bg-indigo-50 dark:bg-indigo-500/10">
                  <h3 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Notifikasi</h3>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors font-black uppercase tracking-tight underline decoration-2 underline-offset-2"
                      >
                        Baca Semua
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="text-[10px] text-red-500 hover:text-red-700 transition-colors font-black uppercase tracking-tight underline decoration-2 underline-offset-2"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700 border-2 border-slate-900 dark:border-white/20 flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                        <Bell className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-[14px] font-black text-slate-400 dark:text-slate-500">Kosong melompong</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                        className={`p-4 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer border-b-2 border-slate-100 dark:border-white/10 last:border-0 relative group/item ${n.is_read ? 'opacity-60 grayscale-[0.5]' : 'bg-white dark:bg-slate-800'}`}
                      >
                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-900 dark:border-white/30 flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#0f172a] dark:shadow-none ${n.type === 'error' ? 'bg-red-400 text-white' : 'bg-indigo-300 dark:bg-indigo-500/30 text-slate-900 dark:text-white'}`}>
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-[13px] font-black text-slate-900 dark:text-white leading-tight pr-6">{n.title}</p>
                              <div className="flex items-center gap-2">
                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-pink-500 border border-slate-900 dark:border-pink-400/50 shrink-0 mt-1 animate-pulse" />}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(e, n.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all absolute right-3 top-3"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 leading-snug">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {n.metadata?.status && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-900 dark:border-white/20 text-slate-900 dark:text-white uppercase">
                                  {n.metadata.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
                  setDrawerOpen(true)
                } else {
                  onLogout()
                }
              }}
              className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white/30 text-slate-900 dark:text-white shadow-none hover:opacity-90 active:opacity-80 transition-all touch-manipulation"
              aria-label="Profile / Menu"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {
        drawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={() => setDrawerOpen(false)}
          />
        )
      }

      {/* Mobile drawer - slide from left */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[60] w-[min(260px,88vw)] max-w-full
          bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-white/10
          flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-out
          md:hidden shadow-2xl
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Menu</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={theme?.toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 touch-manipulation"
              title="Toggle Theme"
            >
              {mounted && (theme?.isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2">
            <NavSections />
          </div>
          <div className="shrink-0">
            <NavFooter />
          </div>
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 z-30 w-56 lg:w-64 border-r-4 border-slate-900 dark:border-white/20 bg-white dark:bg-slate-900 flex-col transition-colors duration-300">
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1">
          <NavSections />
        </nav>
        <div className="shrink-0">
          <NavFooter />
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 w-full md:pb-8 md:pl-56 lg:pl-64 ${isAiLabsFeaturePage ? 'max-md:pt-0 max-md:pb-8 pt-14 pb-[4.5rem]' : 'pt-14 pb-[4.5rem] md:pb-20'}`}
        style={{ paddingBottom: isAiLabsFeaturePage ? undefined : 'max(4.5rem, calc(3.5rem + env(safe-area-inset-bottom)))' }}
      >
        <div className="min-h-full p-4 sm:p-5 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation - mobile (sama seperti yearbook album: flat bar, item ikon + label) */}
      {
        bottomNavItems.length > 0 && (
          <nav
            className={`fixed bottom-0 left-0 right-0 z-40 md:hidden min-h-16 pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 border-t-4 border-slate-900 dark:border-white/20 shadow-[0_-4px_10px_0_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_10px_0_rgba(0,0,0,0.3)] flex items-center justify-around transition-transform duration-300 ease-out ${isAiLabsFeaturePage ? 'max-md:hidden' : ''} ${bottomNavVisible ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 min-w-0 active:scale-95 transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        )
      }
      {/* TopUp Modal */}
      <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} currentCredit={credits} onCreditChange={refreshCredits} />
    </div >
  )
}
