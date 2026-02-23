'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-white antialiased">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Terjadi kesalahan</h2>
        <p className="text-sm text-gray-400 mb-6">
          Maaf, terjadi gangguan. Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 rounded-xl bg-lime-500 text-black font-medium hover:bg-lime-400 transition-colors"
          >
            Coba lagi
          </button>
          <Link
            href="/user/portal/riwayat"
            className="px-4 py-2.5 rounded-xl border border-white/20 font-medium hover:bg-white/10 transition-colors inline-block"
          >
            Riwayat Transaksi
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl text-gray-400 font-medium hover:text-white transition-colors inline-block"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
