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
import { fetchWithAuth } from '../../lib/api-client'

const userNavSections: NavSection[] = [
    {
        title: 'Main Menu',
        items: [
            { href: '/user', label: 'Overview', icon: LayoutDashboard },
            { href: '/user/riwayat', label: 'Riwayat Transaksi', icon: History },
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

    // Theme is now managed by ThemeProvider (supports dark/light toggle)
    const [userName, setUserName] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')

    useEffect(() => {
        let unsubscribed = false
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                if (!unsubscribed) router.replace('/login')
                return
            }

            try {
                const resMe = await fetchWithAuth('/api/user/me')
                const me = await resMe.json().catch(() => ({}))
                if (resMe.ok && me?.isSuspended) {
                    await fetchWithAuth('/api/auth/logout')
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
                            await fetchWithAuth('/api/auth/logout')
                            await supabase.auth.signOut()
                            if (!unsubscribed) router.replace('/login?error=account_suspended')
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'users', filter: `id=eq.${session.user.id}` },
                    async () => {
                        await fetchWithAuth('/api/auth/logout')
                        await supabase.auth.signOut()
                        if (!unsubscribed) router.replace('/login?error=Akun+telah+dihapus+oleh+admin.')
                    }
                )
                .subscribe()

            const res = await fetchWithAuth('/api/auth/otp-status')
            const data = await res.json().catch(() => ({}))
            if (!data.verified) {
                if (!unsubscribed) router.replace('/auth/verify-otp')
                return
            }
            const role = await getRole(supabase, session.user)
            if (role === 'admin') {
                const p = pathname ?? ''
                if (p.startsWith('/user/album/yearbook/')) {
                    const id = p.split('/user/album/yearbook/')[1]?.split('/')[0]
                    if (id) {
                        const q = searchParams?.toString?.() ?? ''
                        if (!unsubscribed) router.replace(`/admin/album/yearbook/${id}${q ? '?' + q : ''}`)
                        return
                    }
                }
                if (p.startsWith('/user')) {
                    if (!unsubscribed) router.replace('/admin')
                    return
                }
            }

            setUserEmail(session.user?.email ?? '')
            setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'User')
            setOk(true)

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
        await fetchWithAuth('/api/auth/logout')
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    if (!ok) {
        return (
            <div className="min-h-[100dvh] bg-white dark:bg-slate-950 flex items-center justify-center transition-colors duration-300" aria-busy="true">
                <div className="w-8 h-8 border-2 border-gray-200 dark:border-white/10 border-t-lime-500 dark:border-t-lime-400 rounded-full animate-spin" />
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
