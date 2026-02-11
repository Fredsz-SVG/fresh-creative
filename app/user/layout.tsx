'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'
import {
  LayoutDashboard,
  History,
} from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'
import { ALBUMS_SECTION_USER, FILES_SECTION_USER } from '@/lib/dashboard-nav'

const userNavSections: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/user/portal', label: 'Overview', icon: LayoutDashboard },
      { href: '/user/portal/riwayat', label: 'Riwayat Transaksi', icon: History },
    ],
  },
  ALBUMS_SECTION_USER,
  FILES_SECTION_USER,
  // AI Labs dipindah ke sidebar album (yearbook)
]

export default function UserLayout({
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
      if (role === 'admin') {
        router.replace('/admin')
        return
      }
      setUserEmail(session.user?.email ?? '')
      setUserName(session.user?.user_metadata?.full_name ?? session.user?.email ?? 'User')
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
