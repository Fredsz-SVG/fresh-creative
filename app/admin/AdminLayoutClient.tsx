'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN } from '@/lib/dashboard-nav'
import YearbookSkeleton from '@/components/yearbook/components/YearbookSkeleton'
import { getSectionModeFromPathname, toSkeletonSection } from '@/components/yearbook/lib/yearbook-paths'

const adminNavSections: NavSection[] = [
    {
        title: 'Main Menu',
        items: [
            { href: '/admin', label: 'Overview', icon: LayoutDashboard },
            { href: '/admin/riwayat', label: 'Riwayat Transaksi', icon: History },
        ],
    },
    ALBUMS_SECTION_ADMIN,
    PRICING_SECTION_ADMIN,
    // AI Labs dipindah ke sidebar album (yearbook)
]

export default function AdminLayoutClient({
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

    const isYearbookAlbumPath = /^\/admin\/album\/yearbook\/[^/]+(\/[^/]+)?$/.test(pathname ?? '')
    const pathParts = (pathname ?? '').split('/')
    const yearbookIdx = pathParts.indexOf('yearbook')
    const yearbookId = yearbookIdx >= 0 && pathParts[yearbookIdx + 1] ? pathParts[yearbookIdx + 1] : ''
    const sectionFromPath = getSectionModeFromPathname(pathname, yearbookId)
    const sectionFromQuery = searchParams.get('section')
    const skeletonSection = isYearbookAlbumPath
        ? toSkeletonSection(sectionFromQuery) ?? sectionFromPath
        : null

    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace('/login')
                return
            }

            // Setting ok immediately so it acts like the user flow and bypasses the skeleton delay
            setUserEmail(session.user?.email ?? '')
            setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'Admin')
            setOk(true)

            const res = await fetch('/api/auth/otp-status', { credentials: 'include' })
            const data = await res.json().catch(() => ({}))
            if (!data.verified) {
                router.replace('/auth/verify-otp')
                return
            }
            const role = await getRole(supabase, session.user)
            if (role !== 'admin') {
                router.replace('/user')
                return
            }
        }
        check()
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
                <div className="h-14 border-b border-white/10 bg-[#0a0a0b]/95 flex items-center justify-between px-4">
                    <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                    <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex flex-1">
                    <aside className="w-56 border-r border-white/10 p-3 hidden md:block space-y-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-8 bg-white/10 rounded-lg animate-pulse" />
                        ))}
                    </aside>
                    <main className="flex-1 p-4 sm:p-6">
                        <div className="h-8 w-64 bg-white/10 rounded animate-pulse mb-6" />
                        <div className="h-64 bg-white/[0.02] border border-white/10 rounded-xl animate-pulse" />
                    </main>
                </div>
            </div>
        )
    }

    return (
        <DashboardShell
            logoHref="/admin"
            sectionTitle="Admin"
            navSections={adminNavSections}
            userDisplayName={userName}
            userBadge="Admin"
            userEmail={userEmail}
            onLogout={handleLogout}
        >
            {children}
        </DashboardShell>
    )
}
