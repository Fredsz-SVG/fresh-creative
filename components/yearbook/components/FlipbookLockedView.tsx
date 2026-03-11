'use client'

import React, { useState } from 'react'
import { Book, Lock, Coins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '../../../lib/api-client'

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
      const res = await fetchWithAuth(`/api/albums/${albumId}/unlock-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_type: 'flipbook' }),
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-[40px] border-4 border-slate-900 shadow-[12px_12px_0_0_#0f172a] max-w-lg mx-auto my-12">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] bg-amber-400 flex items-center justify-center mb-8 border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a]">
        <div className="relative">
          <Book className="w-10 h-10 sm:w-12 sm:h-12 text-slate-900" strokeWidth={3} />
          <div className="absolute -bottom-2 -right-2 bg-white rounded-xl border-4 border-slate-900 p-1.5 shadow-[2px_2px_0_0_#0f172a]">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" strokeWidth={3} />
          </div>
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 uppercase tracking-tight">Flipbook Terkunci</h2>
      <p className="text-slate-400 font-bold text-[10px] sm:text-xs max-w-[280px] sm:max-w-sm mb-10 uppercase tracking-[0.2em] leading-relaxed">
        {isOwner
          ? 'Fitur flipbook tidak termasuk dalam paket Anda. Buka fitur ini dengan kredit untuk mengakses flipbook digital yearbook.'
          : 'Fitur flipbook belum tersedia untuk album ini. Hubungi pemilik album untuk membuka fitur ini.'}
      </p>

      {isOwner && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border-4 border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
            <Coins className="w-5 h-5 text-amber-500" strokeWidth={3} />
            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{creditCost} CREDIT</span>
          </div>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={unlocking}
            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-amber-400 text-slate-900 border-4 border-slate-900 font-black text-sm uppercase tracking-[0.15em] shadow-[8px_8px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {unlocking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                MEMBUKA...
              </>
            ) : (
              <>
                <Book className="w-6 h-6" strokeWidth={3} />
                BUKA FLIPBOOK
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
