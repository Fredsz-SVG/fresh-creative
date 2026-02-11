'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { LayoutDashboard, History } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { PRICING_SECTION_ADMIN, ALBUMS_SECTION_ADMIN, FILES_SECTION_ADMIN } from '@/lib/dashboard-nav'

const adminNavSections: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/riwayat', label: 'Riwayat Transaksi', icon: History },
    ],
  },
  ALBUMS_SECTION_ADMIN,
  FILES_SECTION_ADMIN,
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
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent" />
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
