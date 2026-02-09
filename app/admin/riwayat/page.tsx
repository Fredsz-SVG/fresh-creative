'use client'

import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { History } from 'lucide-react'

export default function AdminRiwayatPage() {
  return (
    <>
      <DashboardTitle
        title="Riwayat Transaksi"
        subtitle="Daftar transaksi dan penggunaan fitur AI (admin)."
      />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-gray-500">
            <History className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-white mb-1">Belum ada riwayat</p>
          <p className="text-xs text-gray-500 max-w-sm">
            Riwayat transaksi akan muncul di sini.
          </p>
        </div>
      </div>
    </>
  )
}
