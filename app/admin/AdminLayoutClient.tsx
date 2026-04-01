'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN, SHOWCASE_SECTION_ADMIN } from '@/lib/dashboard-nav'
import { fetchWithAuth } from '../../lib/api-client'

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

    // Hydrate client-side cached gate after mount (avoid SSR/client mismatch).
    useEffect(() => {
        if (readAdminGate()) setOk(true)
    }, [])

    useEffect(() => {
        let unsubscribed = false
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                clearAdminGate()
                if (!unsubscribed) setOk(false)
                if (!unsubscribed) router.replace('/login')
                return
            }

            try {
                const resMe = await fetchWithAuth('/api/user/me')
                const me = (await resMe.json().catch(() => ({}))) as { isSuspended?: boolean }
                if (resMe.ok && me?.isSuspended) {
                    clearAdminGate()
                    if (!unsubscribed) setOk(false)
                    await fetchWithAuth('/api/auth/logout')
                    await supabase.auth.signOut()
                    if (!unsubscribed) router.replace('/login?error=account_suspended')
                    return
                }
            } catch {
            }

            const res = await fetchWithAuth('/api/auth/otp-status')
            const data = (await res.json().catch(() => ({}))) as { verified?: boolean }
            if (!data.verified) {
                clearAdminGate()
                if (!unsubscribed) setOk(false)
                if (!unsubscribed) router.replace('/auth/verify-otp')
                return
            }
            const role = await getRole(supabase, session.user)
            if (role !== 'admin') {
                clearAdminGate()
                if (!unsubscribed) setOk(false)
                if (!unsubscribed) router.replace('/user')
                return
            }

            setUserEmail(session.user?.email ?? '')
            setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'Admin')
            setOk(true)
            writeAdminGate()
        }
        void check()
        return () => {
            unsubscribed = true
        }
    }, [router])

    const handleLogout = async () => {
        clearAdminGate()
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
