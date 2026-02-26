'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import {
    LayoutDashboard,
    History,
} from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { ALBUMS_SECTION_USER } from '@/lib/dashboard-nav'
import YearbookSkeleton from '@/components/yearbook/components/YearbookSkeleton'
import { getSectionModeFromPathname, toSkeletonSection } from '@/components/yearbook/lib/yearbook-paths'

const userNavSections: NavSection[] = [
    {
        title: 'Main Menu',
        items: [
            { href: '/user/portal', label: 'Overview', icon: LayoutDashboard },
            { href: '/user/portal/riwayat', label: 'Riwayat Transaksi', icon: History },
        ],
    },
    ALBUMS_SECTION_USER,
    // AI Labs dipindah ke sidebar album (yearbook)
]

export default function UserLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [ok, setOk] = useState(false)
    const [userName, setUserName] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')
    // Base yearbook atau yearbook + section (e.g. /yearbook/123 atau /yearbook/123/sampul, .../kelas, .../preview)
    const isYearbookAlbumPath = /^\/user\/portal\/album\/yearbook\/[^/]+(\/[^/]+)?$/.test(pathname ?? '')
    const pathParts = (pathname ?? '').split('/')
    const yearbookIdx = pathParts.indexOf('yearbook')
    const yearbookId = yearbookIdx >= 0 && pathParts[yearbookIdx + 1] ? pathParts[yearbookIdx + 1] : ''
    const sectionFromPath = getSectionModeFromPathname(pathname, yearbookId)
    const sectionFromQuery = searchParams.get('section')
    const skeletonSection = isYearbookAlbumPath
        ? toSkeletonSection(sectionFromQuery) ?? sectionFromPath
        : null

    useEffect(() => {
        let unsubscribed = false
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                if (!unsubscribed) router.replace('/login')
                return
            }

            try {
                const resMe = await fetch('/api/user/me', { credentials: 'include' })
                const me = await resMe.json().catch(() => ({}))
                if (resMe.ok && me?.isSuspended) {
                    await fetch('/api/auth/logout', { credentials: 'include' })
                    await supabase.auth.signOut()
                    if (!unsubscribed) router.replace('/login?error=account_suspended')
                    return
                }
            } catch {
            }

            const channel = supabase
                .channel(`user-suspend-${session.user.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${session.user.id}` },
                    async (payload) => {
                        const nextSuspended = (payload.new as any)?.is_suspended
                        if (nextSuspended) {
                            await fetch('/api/auth/logout', { credentials: 'include' })
                            await supabase.auth.signOut()
                            if (!unsubscribed) router.replace('/login?error=account_suspended')
                        }
                    }
                )
                .subscribe()

            setUserEmail(session.user?.email ?? '')
            setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'User')
            setOk(true)

            const res = await fetch('/api/auth/otp-status', { credentials: 'include' })
            const data = await res.json().catch(() => ({}))
            if (!data.verified) {
                if (!unsubscribed) router.replace('/auth/verify-otp')
                return
            }
            const role = await getRole(supabase, session.user)
            if (role === 'admin') {
                const p = pathname ?? ''
                if (p.startsWith('/user/portal/album/yearbook/')) {
                    const id = p.split('/user/portal/album/yearbook/')[1]?.split('/')[0]
                    if (id) {
                        const q = searchParams?.toString?.() ?? ''
                        if (!unsubscribed) router.replace(`/admin/album/yearbook/${id}${q ? '?' + q : ''}`)
                        return
                    }
                }
                if (p.startsWith('/user/portal')) {
                    if (!unsubscribed) router.replace('/admin')
                    return
                }
            }

            return () => {
                unsubscribed = true
                supabase.removeChannel(channel)
            }
        }
        const cleanupPromise = check()
        return () => {
            unsubscribed = true
            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === 'function') cleanup()
            })
        }
    }, [router, pathname, searchParams])

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { credentials: 'include' })
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    if (!ok) {
        if (skeletonSection) {
            return <YearbookSkeleton section={skeletonSection} />
        }
        return (
            <div className="min-h-[100dvh] bg-[#0a0a0b] flex flex-col">
                {/* Header skeleton */}
                <header className="fixed top-0 left-0 right-0 z-40 h-14 min-h-[44px] border-b border-white/10 bg-[#0a0a0b] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
                        <div className="h-6 w-20 bg-white/10 rounded animate-pulse hidden sm:block" />
                    </div>
                </header>
                {/* Sidebar skeleton - desktop */}
                <aside className="hidden md:flex fixed left-0 top-14 bottom-0 z-30 w-56 lg:w-64 border-r border-white/10 bg-[#0a0a0b] flex-col py-4 px-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-9 w-full bg-white/5 rounded-lg animate-pulse" />
                    ))}
                </aside>
                {/* Main content skeleton */}
                <main className="flex-1 pt-14 pb-20 md:pb-8 md:pl-56 lg:pl-64">
                    <div className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
                        <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    </div>
                </main>
                {/* Bottom nav skeleton - mobile */}
                <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-16 border-t border-white/10 bg-[#0a0a0b] flex items-center justify-around px-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 w-12 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                </nav>
            </div>
        )
    }

    return (
        <DashboardShell
            logoHref="/user"
            sectionTitle="user"
            navSections={userNavSections}
            userDisplayName={userName}
            userBadge="User"
            userEmail={userEmail}
            onLogout={handleLogout}
        >
            {children}
        </DashboardShell>
    )
}
