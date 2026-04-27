'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import {
    LayoutDashboard,
    History,
} from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { ALBUMS_SECTION_USER } from '@/lib/dashboard-nav'
import { fetchWithAuth } from '../../lib/api-client'
import { onAuthChange, signOut } from '@/lib/auth-client'

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

const USER_GATE_STORAGE_KEY = 'fresh_user_layout_verified_v1'
const USER_GATE_MAX_AGE_MS = 7 * 864e5

function readUserGate(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const raw = sessionStorage.getItem(USER_GATE_STORAGE_KEY)
        if (!raw) return false
        const o = JSON.parse(raw) as { ok?: boolean; ts?: number }
        if (o?.ok !== true || typeof o.ts !== 'number') return false
        if (Date.now() - o.ts > USER_GATE_MAX_AGE_MS) {
            sessionStorage.removeItem(USER_GATE_STORAGE_KEY)
            return false
        }
        return true
    } catch {
        try {
            sessionStorage.removeItem(USER_GATE_STORAGE_KEY)
        } catch {
            // ignore
        }
        return false
    }
}

function writeUserGate() {
    try {
        sessionStorage.setItem(USER_GATE_STORAGE_KEY, JSON.stringify({ ok: true, ts: Date.now() }))
    } catch {
        // ignore
    }
}

function clearUserGate() {
    try {
        sessionStorage.removeItem(USER_GATE_STORAGE_KEY)
    } catch {
        // ignore
    }
}

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
    const [userId, setUserId] = useState<string>('')

    // Hydrate cached gate before paint so navigating between user routes does not flash the spinner.
    useLayoutEffect(() => {
        if (readUserGate()) setOk(true)
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
                clearUserGate()
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
                    clearUserGate()
                    if (!unsubscribed) setOk(false)
                    await fetchWithAuth('/api/auth/logout')
                    await signOut()
                    if (!unsubscribed) router.replace('/login?error=account_suspended')
                    return
                }
                if (!bootstrap?.otp?.verified) {
                    clearUserGate()
                    if (!unsubscribed) setOk(false)
                    if (!unsubscribed) router.replace('/auth/verify-otp')
                    return
                }
            } catch {
            }

            const role = (await (async () => {
                try {
                    const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
                    const bootstrap = (await resBootstrap.json().catch(() => ({}))) as any
                    return bootstrap?.me?.role === 'admin' ? 'admin' : 'user'
                } catch {
                    return 'user'
                }
            })())
            if (role === 'admin') {
                clearUserGate()
                if (!unsubscribed) setOk(false)
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

            setUserEmail(user.email ?? '')
            setUserName(user.displayName ?? user.email ?? 'User')
            setUserId(user.uid ?? '')
            setOk(true)
            writeUserGate()

            return () => {
                unsubscribed = true
            }
        }
        const cleanupPromise = check()
        return () => {
            unsubscribed = true
            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === 'function') cleanup()
            })
        }
    }, [router])

    useEffect(() => {
        if (!userId) return

        const handleRealtime = async (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.type === 'user.suspended' && detail?.payload?.userId === userId) {
                if (detail?.payload?.isSuspended) {
                    clearUserGate()
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
        clearUserGate()
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
