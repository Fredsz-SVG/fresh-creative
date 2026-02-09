'use client'

import DashboardTitle from '@/components/dashboard/DashboardTitle'
import FeatureCard from '@/components/dashboard/FeatureCard'
import { LayoutDashboard, Users, Settings } from 'lucide-react'

export default function AdminPage() {
  return (
    <>
      <DashboardTitle
        title="Admin Dashboard"
        subtitle="Kelola pengguna, konten, dan pengaturan sistem."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <FeatureCard
          href="/admin"
          title="Overview"
          description="Ringkasan aktivitas dan statistik sistem."
          icon={LayoutDashboard}
          badge="FREE"
        />
        <FeatureCard
          href="/admin"
          title="User Management"
          description="Kelola akun user dan role (coming soon)."
          icon={Users}
          badge="PRO"
        />
        <FeatureCard
          href="/admin"
          title="Settings"
          description="Konfigurasi aplikasi dan integrasi (coming soon)."
          icon={Settings}
          badge="PRO"
        />
      </div>
    </>
  )
}
