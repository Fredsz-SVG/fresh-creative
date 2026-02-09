'use client'

import { X, CreditCard, Wallet, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type TopUpModalProps = {
    isOpen: boolean
    onClose: () => void
    currentCredit?: number
}

type CreditPackage = {
    id: string
    credits: number
    price: number
    popular: boolean
}

export default function TopUpModal({ isOpen, onClose, currentCredit = 0 }: TopUpModalProps) {
    const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
    const [packages, setPackages] = useState<CreditPackage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            // Fetch initial data if empty
            if (packages.length === 0) {
                setLoading(true)
                fetch(`/api/credits/packages?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) setPackages(data)
                    })
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false))
            }

            // Realtime subscription
            const channel = supabase
                .channel('room-credit-packages')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'credit_packages' },
                    (payload: any) => {

                        // Optimistic Update
                        setPackages((prev) => {
                            let newPackages = [...prev]

                            if (payload.eventType === 'INSERT') {
                                newPackages.push(payload.new)
                            } else if (payload.eventType === 'UPDATE') {
                                newPackages = newPackages.map((p) => (p.id === payload.new.id ? payload.new : p))
                            } else if (payload.eventType === 'DELETE') {
                                newPackages = newPackages.filter((p) => p.id !== payload.old.id)
                                // Clear selection if needed
                                setSelectedPkg((cur) => (cur === payload.old.id ? null : cur))
                            }

                            // Sort by price (ascending)
                            return newPackages.sort((a, b) => a.price - b.price)
                        })

                        // Backup Fetch (debounced)
                        setTimeout(() => {
                            fetch(`/api/credits/packages?t=${Date.now()}`)
                                .then((res) => res.json())
                                .then((data) => {
                                    if (Array.isArray(data)) {
                                        setPackages(data)
                                    }
                                })
                        }, 1000)
                    }
                )
                .subscribe()

            // Polling Backup (Every 3s)
            const interval = setInterval(() => {
                fetch(`/api/credits/packages?t=${Date.now()}`)
                    .then((res) => res.json())
                    .then((data) => {
                        if (Array.isArray(data)) setPackages(data)
                    })
                    .catch(() => { })
            }, 3000)

            return () => {
                supabase.removeChannel(channel)
                clearInterval(interval)
            }
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-md bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">Top Up Credit</h3>
                            <p className="text-xs text-gray-400">Balance: {currentCredit} Credits</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <p className="text-sm text-gray-400 mb-4">Pilih paket credit yang ingin dibeli:</p>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-lime-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mb-6 max-h-[280px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {packages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    onClick={() => setSelectedPkg(pkg.id)}
                                    className={`
                      relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
                      ${selectedPkg === pkg.id
                                            ? 'border-lime-500 bg-lime-500/10 text-white'
                                            : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:bg-white/5'}
                    `}
                                >
                                    {pkg.popular && (
                                        <span className="absolute -top-2.5 bg-lime-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Popular
                                        </span>
                                    )}
                                    <span className={`text-2xl font-bold mb-1 ${selectedPkg === pkg.id ? 'text-lime-400' : 'text-white'}`}>
                                        {pkg.credits}
                                    </span>
                                    <span className="text-xs uppercase tracking-wide opacity-80">Credits</span>
                                    <div className={`mt-3 text-sm font-medium px-3 py-1 rounded-lg ${selectedPkg === pkg.id ? 'bg-lime-500 text-black' : 'bg-white/10 text-white'}`}>
                                        Rp {pkg.price.toLocaleString('id-ID')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        disabled={!selectedPkg}
                        className="w-full py-3.5 px-4 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Beli Sekarang
                    </button>
                    <p className="text-center text-[10px] text-gray-500 mt-3">
                        Pembayaran aman & terpercaya via Payment Gateway.
                    </p>
                </div>
            </div>
        </div>
    )
}
