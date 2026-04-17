'use client'

import React, { useState } from 'react'
import { Book, Lock, Coins, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { fetchWithAuth } from '../../../lib/api-client'
import { asObject, getErrorMessage } from '@/components/yearbook/utils/response-narrowing'

interface FlipbookLockedViewProps {
  albumId?: string
  isOwner: boolean
  creditCost: number
  onUnlocked?: () => void
}

export default function FlipbookLockedView({ albumId, isOwner, creditCost, onUnlocked }: FlipbookLockedViewProps) {
  const [unlocking, setUnlocking] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleUnlock = async () => {
    if (!albumId) return
    setUnlocking(true)
    try {
      const res = await fetchWithAuth(`/api/albums/${albumId}/unlock-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_type: 'flipbook' }),
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (res.ok) {
        toast.success('Flipbook berhasil dibuka! 🎉')
        onUnlocked?.()
      } else if (res.status === 402) {
        toast.error(getErrorMessage(data, 'Credit tidak cukup. Silakan top up terlebih dahulu.'))
      } else if (res.status === 409) {
        toast.info('Flipbook sudah dibuka sebelumnya.')
        onUnlocked?.()
      } else {
        toast.error(getErrorMessage(data, 'Gagal membuka flipbook.'))
      }
    } catch (err) {
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] max-w-lg mx-auto my-12">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] bg-amber-400 dark:bg-amber-500 flex items-center justify-center mb-8 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
        <div className="relative">
          <Book className="w-10 h-10 sm:w-12 sm:h-12 text-slate-900" strokeWidth={3} />
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-900 dark:border-slate-700 p-1 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900 dark:text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">Flipbook Terkunci</h2>
      <p className="text-slate-400 dark:text-slate-400 font-bold text-[10px] sm:text-xs max-w-[280px] sm:max-w-sm mb-10 uppercase tracking-[0.2em] leading-relaxed">
        {isOwner
          ? 'Fitur flipbook tidak termasuk dalam paket Anda. Buka fitur ini dengan kredit untuk mengakses flipbook digital yearbook.'
          : 'Fitur flipbook belum tersedia untuk album ini. Hubungi pemilik album untuk membuka fitur ini.'}
      </p>

      {isOwner && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
            <Coins className="w-5 h-5 text-amber-500 dark:text-amber-400" strokeWidth={3} />
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{creditCost} CREDIT</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={unlocking}
            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-amber-400 dark:bg-amber-500 text-slate-900 dark:text-slate-900 border-2 border-slate-900 dark:border-slate-700 font-black text-sm uppercase tracking-[0.15em] shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
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

      {confirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Buka Flipbook</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Yakin tidak? Unlock flipbook akan menggunakan {creditCost} credit.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  handleUnlock()
                }}
                className="flex-1 py-3.5 rounded-xl bg-amber-400 dark:bg-amber-600 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Buka
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
