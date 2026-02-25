'use client'

import React, { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TopUpModal from '@/components/dashboard/TopUpModal'

export default function CreditBadgeTop() {
    const [credits, setCredits] = useState(0)
    const [showTopUp, setShowTopUp] = useState(false)

    useEffect(() => {
        let channel: any

        const init = async () => {
            try {
                const res = await fetch('/api/user/me')
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
            fetch('/api/user/me')
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

    return (
        <>
            <button
                type="button"
                onClick={() => setShowTopUp(true)}
                className="flex flex-col items-end group cursor-pointer"
            >
                <p className="text-[10px] uppercase tracking-wider text-gray-500 group-hover:text-lime-400 transition-colors">Credit</p>
                <div className="flex items-center gap-1.5 text-xs font-medium text-white group-hover:text-lime-400 transition-colors">
                    <Coins className="w-3.5 h-3.5 text-lime-400" />
                    <span>{credits}</span>
                </div>
            </button>
            <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} currentCredit={credits} />
        </>
    )
}
