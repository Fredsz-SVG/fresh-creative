'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN, SHOWCASE_SECTION_ADMIN } from '@/lib/dashboard-nav'
import { fetchWithAuth } from '../../lib/api-client'

const adminNavSections: NavSection[] = [
    {
        title: 'Main Menu',
        items: [
            { href: '/admin', label: 'Overview', icon: LayoutDashboard },
            { href: '/admin/riwayat', label: 'Riwayat Transaksi', icon: History },
        ],
    },
    ALBUMS_SECTION_ADMIN,
    SHOWCASE_SECTION_ADMIN,
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
                .channel(`admin-user-suspend-${session.user.id}`)
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
            if (role !== 'admin') {
                if (!unsubscribed) router.replace('/user')
                return
            }

            setUserEmail(session.user?.email ?? '')
            setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'Admin')
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
