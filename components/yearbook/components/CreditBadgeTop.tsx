'use client'

import React from 'react'
import { Coins } from 'lucide-react'
import { useTopUpCredits } from '@/components/dashboard/top-up-credits-context'

/** Badge kredit di header yearbook — membuka TopUpModal yang sama dengan header DashboardShell (satu UI). */
export default function CreditBadgeTop() {
    const { openTopUp, credits } = useTopUpCredits()

    return (
        <button
            type="button"
            onClick={openTopUp}
            className="flex flex-col items-end group cursor-pointer transition-all active:scale-95"
        >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Credits</p>
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" strokeWidth={3} />
                <span className="tabular-nums">{credits}</span>
            </div>
        </button>
    )
}
