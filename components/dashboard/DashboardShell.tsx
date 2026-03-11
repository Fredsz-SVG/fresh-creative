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
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import TopUpModal from './TopUpModal'
import { supabase } from '@/lib/supabase'
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'

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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  // Credits state
  const [credits, setCredits] = useState(0)

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
    let channel: any

    fetchNotifications() // initial fetch

    const init = async () => {
      try {
        const res = await fetchWithAuth('/api/user/me')
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
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${data.id}`
              },
              (payload: any) => {
                if (payload.new) {
                  setNotifications(prev => [payload.new, ...prev])
                  if (!payload.new.is_read) {
                    setUnreadCount(prev => prev + 1)
                  }
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${data.id}`
              },
              (payload: any) => {
                if (payload.new) {
                  setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
                  // Re-calculate unread count from the new state to be safe
                  setNotifications(currentNotifs => {
                    const updated = currentNotifs.map(n => n.id === payload.new.id ? payload.new : n)
                    setUnreadCount(updated.filter(n => !n.is_read).length)
                    return updated
                  })
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${data.id}`
              },
              (payload: any) => {
                if (payload.old) {
                  setNotifications(prev => {
                    const filtered = prev.filter(n => n.id !== payload.old.id)
                    setUnreadCount(filtered.filter(n => !n.is_read).length)
                    return filtered
                  })
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
      if (channel) supabase.removeChannel(channel)
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


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      document.documentElement.removeAttribute('data-theme')
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

  const navLinkClass = (isActive: boolean) =>
    `group flex items-center gap-2.5 min-h-[36px] px-3 py-2 rounded-xl text-[13px] font-black transition-all duration-200 touch-manipulation border-2 border-transparent ${isActive
      ? 'bg-indigo-300 border-slate-900 text-slate-900 shadow-[3px_3px_0_0_#0f172a] -translate-y-0.5'
      : 'text-slate-600 hover:border-slate-900 hover:bg-emerald-300 hover:text-slate-900 hover:shadow-[3px_3px_0_0_#0f172a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
    }`

  const NavSections = () => (
    <>
      {(Array.isArray(navSections) ? navSections : []).map((section) => {
        if (!section?.items?.length) return null
        return (
          <div key={section.title} className="space-y-0.5">
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] text-slate-800 bg-white border border-slate-900 px-1.5 py-0.5 flex items-center rounded-full shadow-[1px_1px_0_0_#0f172a] font-black leading-none pt-1">({item.badge})</span>
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
    <div className="p-3 border-t-2 border-slate-900 bg-white">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-200 border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] min-h-[36px]">
        <div className="w-8 h-8 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-[13px] shrink-0 shadow-[2px_2px_0_0_#0f172a]">
          {(userDisplayName || userEmail || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-900 truncate tracking-tight">{userDisplayName || 'User'}</p>
          {userBadge && <p className="text-[10px] text-indigo-700 font-black truncate">{userBadge}</p>}
        </div>
      </div>
      {onLogout && (
        <button
          type="button"
          onClick={() => {
            setLogoutConfirmOpen(true)
          }}
          className="mt-3 w-full min-h-[36px] px-3 py-2 rounded-xl text-center text-xs font-black text-white bg-red-500 border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none hover:bg-red-400 touch-manipulation transition-all"
        >
          LOGOUT
        </button>
      )}
    </div>
  )

  if (isYearbookAlbumPage) {
    return (
      <div className="dashboard-shell min-h-[100dvh] bg-white text-gray-900">
        {children}
      </div>
    )
  }

  return (
    <div className="dashboard-shell min-h-[100dvh] bg-white text-gray-800 flex flex-col">
      {logoutConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
          onClick={() => setLogoutConfirmOpen(false)}
        >
          <div
            className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-500 mb-2">Logout</h3>
            <p className="text-sm text-gray-500 mb-5">
              Yakin ingin logout dari akun ini?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-sm font-semibold"
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
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-semibold shadow-sm"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-14 min-h-[44px] border-b-2 border-slate-900 bg-white flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] shadow-[0_4px_0_0_#0f172a] ${isAiLabsFeaturePage ? 'max-md:hidden' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={logoHref}
            className="flex items-center gap-1 md:gap-2 text-slate-900 font-black uppercase tracking-wider text-[10px] md:text-[15px] shrink-0 min-h-[44px]"
          >
            <div className="w-5 h-5 md:w-7 md:h-7 bg-orange-300 border-2 border-slate-900 rounded shadow-[1.5px_1.5px_0_0_#0f172a] md:shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center -mt-0.5 shrink-0">
              <Zap className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0 text-slate-900 fill-slate-900" />
            </div>
            <span className="inline">FRESHCREATIVE.ID</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-2 text-slate-400 text-sm font-black uppercase tracking-widest truncate ml-1">
            {sectionTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Credit Display */}
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="flex flex-col items-end mr-3 sm:mr-4 group cursor-pointer"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-900 group-hover:text-indigo-600 transition-colors font-black">Credit</p>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[15px]">{credits}</span>
            </div>
          </button>

          <div className="hidden md:flex flex-col items-end mr-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-900 font-black">Status</p>
            <p className={`text-[12px] font-black uppercase tracking-tight py-0.5 px-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] -rotate-1 ${isOnline ? 'bg-emerald-300 text-slate-900' : 'bg-red-400 text-white'}`}>
              {isOnline ? 'Connected' : 'Offline'}
            </p>
          </div>
          {/* Notification */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all touch-manipulation"
            >
              <Bell className="w-5 h-5" strokeWidth={3} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 border-2 border-slate-900 animate-pulse flex items-center justify-center text-[9px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed left-1/2 -translate-x-1/2 top-[calc(4rem+env(safe-area-inset-top))] w-[calc(100vw-2rem)] max-w-sm md:left-auto md:right-0 md:top-full md:mt-4 md:w-80 md:translate-x-0 md:absolute bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0_0_#0f172a] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b-2 border-slate-900 flex items-center justify-between bg-indigo-50">
                  <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Notifikasi</h3>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors font-black uppercase tracking-tight underline decoration-2 underline-offset-2"
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
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-900 flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Bell className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-[14px] font-black text-slate-400">Kosong melompong</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                        className={`p-4 hover:bg-emerald-50 transition-colors cursor-pointer border-b-2 border-slate-100 last:border-0 relative group/item ${n.is_read ? 'opacity-60 grayscale-[0.5]' : 'bg-white'}`}
                      >
                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#0f172a] ${n.type === 'error' ? 'bg-red-400 text-white' : 'bg-indigo-300 text-slate-900'}`}>
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-[13px] font-black text-slate-900 leading-tight pr-6">{n.title}</p>
                              <div className="flex items-center gap-2">
                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-pink-500 border border-slate-900 shrink-0 mt-1 animate-pulse" />}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(e, n.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all absolute right-3 top-3"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[12px] font-bold text-slate-600 leading-snug">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {n.metadata?.status && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 border border-slate-900 text-slate-900 uppercase">
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
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all touch-manipulation"
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
          bg-white border-r border-gray-100
          flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-out
          md:hidden shadow-2xl
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Menu</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
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
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 z-30 w-56 lg:w-64 border-r-4 border-slate-900 bg-white flex-col">
        <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1">
          <NavSections />
        </nav>
        <div className="shrink-0">
          <NavFooter />
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 w-full md:pb-8 md:pl-56 lg:pl-64 ${isAiLabsFeaturePage ? 'max-md:pt-0 max-md:pb-8 pt-14 pb-[5.5rem]' : 'pt-14 pb-[5.5rem] md:pb-20'}`}
        style={{ paddingBottom: isAiLabsFeaturePage ? undefined : 'max(5.5rem, calc(4rem + env(safe-area-inset-bottom)))' }}
      >
        <div className="min-h-full p-4 sm:p-5 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation - mobile */}
      {
        bottomNavItems.length > 0 && (
          <nav
            className={`fixed bottom-0 left-0 right-0 z-40 md:hidden min-h-[4.5rem] pt-2 border-t-[3px] border-slate-900 bg-white flex items-center justify-around px-2 shadow-[0_-4px_0_0_#0f172a] ${isAiLabsFeaturePage ? 'max-md:hidden' : ''}`}
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                  flex flex-col items-center justify-center gap-1 flex-1 min-h-[3.25rem] py-2 rounded-xl border-2 border-transparent
                  transition-all duration-200 touch-manipulation active:scale-95 mx-1
                  ${isActive ? 'text-slate-900 bg-emerald-300 border-slate-900 shadow-[2px_2px_0_0_#0f172a] -translate-y-1' : 'text-slate-500 hover:text-slate-900'}
                `}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'fill-emerald-300' : ''}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
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
