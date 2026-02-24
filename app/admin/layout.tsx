'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN } from '@/lib/dashboard-nav'

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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
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
      setUserEmail(session.user?.email ?? '')
      setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'Admin')
      setOk(true)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { credentials: 'include' })
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  if (!ok) {
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
