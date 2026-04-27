'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN, SHOWCASE_SECTION_ADMIN } from '@/lib/dashboard-nav'
import { fetchWithAuth } from '../../lib/api-client'
import { onAuthChange, signOut } from '@/lib/auth-client'

/** Session cache: after first successful admin gate, skip full-screen spinner when layout remounts (e.g. back from /album/.../preview). */
const ADMIN_GATE_STORAGE_KEY = 'fresh_admin_layout_verified_v1'
const ADMIN_GATE_MAX_AGE_MS = 7 * 864e5

function readAdminGate(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const raw = sessionStorage.getItem(ADMIN_GATE_STORAGE_KEY)
        if (!raw) return false
        const o = JSON.parse(raw) as { ok?: boolean; ts?: number }
        if (o?.ok !== true || typeof o.ts !== 'number') return false
        if (Date.now() - o.ts > ADMIN_GATE_MAX_AGE_MS) {
            sessionStorage.removeItem(ADMIN_GATE_STORAGE_KEY)
            return false
        }
        return true
    } catch {
        try {
            sessionStorage.removeItem(ADMIN_GATE_STORAGE_KEY)
        } catch {
            /* ignore */
        }
        return false
    }
}

function writeAdminGate() {
    try {
        sessionStorage.setItem(ADMIN_GATE_STORAGE_KEY, JSON.stringify({ ok: true, ts: Date.now() }))
    } catch {
        /* ignore */
    }
}

function clearAdminGate() {
    try {
        sessionStorage.removeItem(ADMIN_GATE_STORAGE_KEY)
    } catch {
        /* ignore */
    }
}

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
    const [ok, setOk] = useState(false)

    // Theme is now managed by ThemeProvider (supports dark/light toggle)
    const [userName, setUserName] = useState<string>('')
    const [userEmail, setUserEmail] = useState<string>('')
    const [userId, setUserId] = useState<string>('')

    // Hydrate cached gate before paint so navigating between admin routes does not flash the spinner.
    useLayoutEffect(() => {
        if (readAdminGate()) setOk(true)
    }, [])

    useEffect(() => {
        let unsubscribed = false
        const check = async () => {
            const user = await new Promise<import('@/lib/auth-client').AuthUser | null>((resolve) => {
                const unsub = onAuthChange((u) => {
                    unsub()
                    resolve(u)
                })
            })
            if (!user) {
                clearAdminGate()
                if (!unsubscribed) setOk(false)
                if (!unsubscribed) router.replace('/login')
                return
            }

            try {
                const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
                const bootstrap = (await resBootstrap.json().catch(() => ({}))) as {
                    me?: { isSuspended?: boolean; role?: 'admin' | 'user' }
                    otp?: { verified?: boolean }
                }
                if (resBootstrap.ok && bootstrap?.me?.isSuspended) {
                    clearAdminGate()
                    if (!unsubscribed) setOk(false)
                    await fetchWithAuth('/api/auth/logout')
                    await signOut()
                    if (!unsubscribed) router.replace('/login?error=account_suspended')
                    return
                }
                if (!bootstrap?.otp?.verified) {
                    clearAdminGate()
                    if (!unsubscribed) setOk(false)
                    if (!unsubscribed) router.replace('/auth/verify-otp')
                    return
                }
            } catch {
            }

            let role: 'admin' | 'user' = 'user'
            try {
                const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
                const bootstrap = (await resBootstrap.json().catch(() => ({}))) as any
                role = bootstrap?.me?.role === 'admin' ? 'admin' : 'user'
            } catch {
                role = 'user'
            }
            if (role !== 'admin') {
                clearAdminGate()
                if (!unsubscribed) setOk(false)
                if (!unsubscribed) router.replace('/user')
                return
            }

            setUserEmail(user.email ?? '')
            setUserName(user.displayName ?? user.email ?? 'Admin')
            setUserId(user.uid ?? '')
            setOk(true)
            writeAdminGate()
        }
        void check()
        return () => {
            unsubscribed = true
        }
    }, [router])

    useEffect(() => {
        if (!userId) return

        const handleRealtime = async (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.type === 'user.suspended' && detail?.payload?.userId === userId) {
                if (detail?.payload?.isSuspended) {
                    clearAdminGate()
                    setOk(false)
                    await fetchWithAuth('/api/auth/logout')
                    await signOut()
                    router.replace('/login?error=account_suspended')
                }
            }
        }

        window.addEventListener('fresh:realtime', handleRealtime)
        return () => window.removeEventListener('fresh:realtime', handleRealtime)
    }, [userId, router])

    const handleLogout = async () => {
        clearAdminGate()
        await fetchWithAuth('/api/auth/logout')
        await signOut()
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
