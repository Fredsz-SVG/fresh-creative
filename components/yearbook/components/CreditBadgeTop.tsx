'use client'

import React, { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TopUpModal from '@/components/dashboard/TopUpModal'
import { apiUrl } from '../../../lib/api-url'
import { fetchWithAuth } from '../../../lib/api-client'

export default function CreditBadgeTop() {
    const [credits, setCredits] = useState(0)
    const [showTopUp, setShowTopUp] = useState(false)

    useEffect(() => {
        let channel: any

        const init = async () => {
            try {
                const res = await fetchWithAuth('/api/user/me')
                const data = await res.json()
                if (typeof data.credits === 'number') setCredits(data.credits)

                if (data.id) {
                    channel = supabase
                        .channel(`ailabs-realtime-header-${data.id}`)
                        .on(
                            'postgres_changes',
                            {
                                event: 'UPDATE',
                                schema: 'public',
                                table: 'users',
                                filter: `id=eq.${data.id}`
                            },
                            (payload: any) => {
                                if (payload.new && typeof payload.new.credits === 'number') {
                                    setCredits(payload.new.credits)
                                }
                            }
                        )
                        .subscribe()
                }
            } catch (e) {
                // ignore
            }
        }

        init()

        const onCreditsUpdated = () => {
            fetchWithAuth('/api/user/me')
                .then((res) => res.json())
                .then((data) => {
                    if (typeof data.credits === 'number') setCredits(data.credits)
                })
                .catch(() => { })
        }
        window.addEventListener('credits-updated', onCreditsUpdated)

        return () => {
            if (channel) supabase.removeChannel(channel)
            window.removeEventListener('credits-updated', onCreditsUpdated)
        }
    }, [])

    // Callback to refresh credits after redeem
    const refreshCredits = () => {
        fetchWithAuth('/api/user/me')
            .then((res) => res.json())
            .then((data) => {
                if (typeof data.credits === 'number') setCredits(data.credits)
                // Debug log
                console.log('[CreditBadgeTop] Credits refreshed after redeem:', data.credits)
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
