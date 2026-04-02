'use client'

import React, { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'
import TopUpModal from '@/components/dashboard/TopUpModal'
import { fetchWithAuth } from '../../../lib/api-client'
import { asObject } from '@/components/yearbook/utils/response-narrowing'

export default function CreditBadgeTop() {
    const [credits, setCredits] = useState(0)
    const [showTopUp, setShowTopUp] = useState(false)

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetchWithAuth('/api/user/me')
                const data = asObject(await res.json().catch(() => ({})))
                if (typeof data.credits === 'number') setCredits(data.credits)
            } catch (e) {
                // ignore
            }
        }

        init()

        const onCreditsUpdated = () => {
            fetchWithAuth('/api/user/me')
                .then((res) => res.json())
                .then((data) => {
                    const parsed = asObject(data)
                    if (typeof parsed.credits === 'number') setCredits(parsed.credits)
                })
                .catch(() => { })
        }
        window.addEventListener('credits-updated', onCreditsUpdated)

        return () => {
            window.removeEventListener('credits-updated', onCreditsUpdated)
        }
    }, [])

    // Callback to refresh credits after redeem
    const refreshCredits = () => {
        fetchWithAuth('/api/user/me')
            .then((res) => res.json())
            .then((data) => {
                const parsed = asObject(data)
                if (typeof parsed.credits === 'number') setCredits(parsed.credits)
                // Debug log
                console.log('[CreditBadgeTop] Credits refreshed after redeem:', parsed.credits)
                // Dispatch event for any listeners
                window.dispatchEvent(new Event('credits-updated'))
            })
            .catch(() => { })
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setShowTopUp(true)}
                className="flex flex-col items-end group cursor-pointer transition-all active:scale-95"
            >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Credits</p>
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" strokeWidth={3} />
                    <span className="tabular-nums">{credits}</span>
                </div>
            </button>
            <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} currentCredit={credits} onCreditChange={refreshCredits} />
        </>
    )
}
