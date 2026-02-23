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
    const [loadingCheckout, setLoadingCheckout] = useState(false)
    const [checkoutInvoiceUrl, setCheckoutInvoiceUrl] = useState<string | null>(null)

    const handleCloseCheckoutPopup = () => {
        setCheckoutInvoiceUrl(null)
        onClose()
    }

    const handleCheckout = async () => {
        if (!selectedPkg) return
        setLoadingCheckout(true)
        try {
            const res = await fetch('/api/credits/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId: selectedPkg })
            })
            const data = await res.json()
            if (res.ok && data.invoiceUrl) {
                toast.success('Faktur pembayaran berhasil dibuat! Selesaikan pembayaran di bawah.')
                setCheckoutInvoiceUrl(data.invoiceUrl)
            } else {
                toast.error(data.error || 'Terjadi kesalahan saat memproses pembayaran')
            }
        } catch (error) {
            toast.error('Gagal membuat tagihan pembayaran')
        } finally {
            setLoadingCheckout(false)
        }
    }

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
        <>
        {/* Popup pembayaran Xendit di dalam halaman */}
        {checkoutInvoiceUrl && (
            <div className="fixed inset-0 z-[110] flex flex-col bg-[#0a0a0b]" role="dialog" aria-modal="true" aria-label="Pembayaran Xendit">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                    <h3 className="text-sm font-semibold text-white">Selesaikan Pembayaran</h3>
                    <button
                        type="button"
                        onClick={handleCloseCheckoutPopup}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 relative">
                    <iframe
                        src={checkoutInvoiceUrl}
                        title="Xendit Invoice"
                        className="absolute inset-0 w-full h-full border-0"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
                        allow="payment"
                    />
                </div>
            </div>
        )}

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={checkoutInvoiceUrl ? undefined : onClose}>
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
                        <div className="mb-6 max-h-[280px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="grid grid-cols-2 gap-3 pt-3 pb-2 px-1">
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
                                            <span className="absolute -top-3 bg-lime-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                                                Popular
                                            </span>
                                        )}
                                        <span className={`text-2xl font-bold mb-1 ${selectedPkg === pkg.id ? 'text-lime-400' : 'text-white'}`}>
                                            {pkg.credits}
                                        </span>
                                        <span className="text-xs uppercase tracking-wide opacity-80">Credits</span>
                                        <div className={`mt-3 text-sm font-medium px-2 py-1 w-full rounded-lg ${selectedPkg === pkg.id ? 'bg-lime-500 text-black' : 'bg-white/10 text-white'}`}>
                                            <div className="truncate text-center">Rp {pkg.price.toLocaleString('id-ID')}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCheckout}
                        disabled={!selectedPkg || loadingCheckout}
                        className="w-full py-3.5 px-4 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {loadingCheckout ? 'Memproses...' : 'Beli Sekarang'}
                    </button>
                    <p className="text-center text-[10px] text-gray-500 mt-3">
                        Pembayaran aman & terpercaya via Payment Gateway.
                    </p>
                </div>
            </div>
        </div>
        </>
    )
}
