'use client'

import React, { useState } from 'react'
import { Book, Lock, Coins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FlipbookLockedViewProps {
  albumId?: string
  isOwner: boolean
  creditCost: number
  onUnlocked?: () => void
}

export default function FlipbookLockedView({ albumId, isOwner, creditCost, onUnlocked }: FlipbookLockedViewProps) {
  const [unlocking, setUnlocking] = useState(false)

  const handleUnlock = async () => {
    if (!albumId) return
    setUnlocking(true)
    try {
      const res = await fetch(`/api/albums/${albumId}/unlock-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_type: 'flipbook' }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Flipbook berhasil dibuka! 🎉')
        onUnlocked?.()
      } else if (res.status === 402) {
        toast.error(data.error || 'Credit tidak cukup. Silakan top up terlebih dahulu.')
      } else if (res.status === 409) {
        toast.info('Flipbook sudah dibuka sebelumnya.')
        onUnlocked?.()
      } else {
        toast.error(data.error || 'Gagal membuka flipbook.')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6">
        <div className="relative">
          <Book className="w-10 h-10 text-amber-400" />
          <Lock className="w-5 h-5 text-amber-500 absolute -bottom-1 -right-1" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Flipbook Terkunci</h2>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        {isOwner
          ? 'Fitur flipbook tidak termasuk dalam paket Anda. Buka fitur ini dengan credit untuk mengakses flipbook digital yearbook.'
          : 'Fitur flipbook belum tersedia untuk album ini. Hubungi pemilik album untuk membuka fitur ini.'}
      </p>

      {isOwner && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300">Biaya:</span>
            <span className="font-bold text-amber-400">{creditCost} credit</span>
          </div>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={unlocking}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-amber-900/30"
          >
            {unlocking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Membuka...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Buka Flipbook
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
