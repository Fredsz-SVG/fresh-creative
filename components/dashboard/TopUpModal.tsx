'use client'

import { X, CreditCard, Wallet, Loader2, Gift, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '../../lib/api-client'

type TopUpModalProps = {
    isOpen: boolean
    onClose: () => void
    currentCredit?: number
    onCreditChange?: () => void
}

type CreditPackage = {
    id: string
    credits: number
    price: number
    popular: boolean
}

export default function TopUpModal({ isOpen, onClose, currentCredit = 0, onCreditChange }: TopUpModalProps) {
    const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
    const [packages, setPackages] = useState<CreditPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingCheckout, setLoadingCheckout] = useState(false)
    const [checkoutInvoiceUrl, setCheckoutInvoiceUrl] = useState<string | null>(null)
    const [redeemCode, setRedeemCode] = useState('')
    const [redeemLoading, setRedeemLoading] = useState(false)
    const [showRedeem, setShowRedeem] = useState(false)

    const handleCloseCheckoutPopup = () => {
        setCheckoutInvoiceUrl(null)
        onClose()
    }

    const handleCloseModal = () => {
        setShowRedeem(false)
        setRedeemCode('')
        onClose()
    }

    const handleRedeem = async () => {
        if (!redeemCode.trim()) return
        setRedeemLoading(true)
        try {
            const res = await fetchWithAuth('/api/credits/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeem', code: redeemCode.trim() }),
            })
            const data = await res.json()
            if (res.ok && data.ok) {
                toast.success(`🎉 Berhasil! +${data.credits_received} credit ditambahkan.`)
                setRedeemCode('')
                setShowRedeem(false)
                handleCloseModal()
                if (onCreditChange) onCreditChange()
            } else {
                toast.error(data.error || 'Kode tidak valid.')
            }
        } catch {
            toast.error('Gagal redeem. Coba lagi.')
        } finally {
            setRedeemLoading(false)
        }
    }

    const handleCheckout = async () => {
        if (!selectedPkg) return
        setLoadingCheckout(true)
        try {
            const res = await fetchWithAuth('/api/credits/checkout', {
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
                fetchWithAuth(`/api/credits/packages?t=${Date.now()}`)
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
                            fetchWithAuth(`/api/credits/packages?t=${Date.now()}`)
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
                fetchWithAuth(`/api/credits/packages?t=${Date.now()}`)
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
                <div className="fixed inset-0 z-[110] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Pembayaran Xendit">
                    <div className="flex items-center justify-between px-6 py-4 border-b-4 border-slate-900 bg-slate-50 shrink-0">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Selesaikan Pembayaran</h3>
                        <button
                            type="button"
                            onClick={handleCloseCheckoutPopup}
                            className="flex items-center justify-center w-10 h-10 rounded-xl border-4 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-[4px_4px_0_0_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1"
                        >
                            <X className="w-6 h-6" strokeWidth={3} />
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

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={checkoutInvoiceUrl ? undefined : handleCloseModal}>
                <div
                    className="relative w-full max-w-md bg-white border-4 border-slate-900 rounded-[32px] shadow-[12px_12px_0_0_#0f172a] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b-4 border-slate-900 bg-indigo-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-400 border-4 border-slate-900 flex items-center justify-center text-slate-900 shadow-[4px_4px_0_0_#0f172a]">
                                <Wallet className="w-6 h-6" strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Top Up Credit</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldo Anda:</p>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md border-2 border-slate-900">{currentCredit} CREDITS</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleCloseModal}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border-4 border-slate-900 bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-[4px_4px_0_0_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1"
                        >
                            <X className="w-6 h-6" strokeWidth={3} />
                        </button>
                    </div>

                    {/* Body - Non-scrollable parent */}
                    <div className="p-6 bg-white">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pilih Paket Credit</p>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" strokeWidth={3} />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Paket...</span>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <div className="max-h-[290px] overflow-y-auto no-scrollbar px-2">
                                    <div className="grid grid-cols-2 gap-3 pt-4 pb-3">
                                        {packages.map((pkg) => (
                                            <button
                                                key={pkg.id}
                                                onClick={() => setSelectedPkg(pkg.id)}
                                                className={`
                                                    relative flex flex-col items-center justify-center p-3.5 rounded-[20px] border-4 transition-all duration-200
                                                    ${selectedPkg === pkg.id
                                                        ? 'border-slate-900 bg-indigo-400 text-slate-900 shadow-[4px_4px_0_0_#0f172a]'
                                                        : 'border-slate-900 bg-white text-slate-400 hover:bg-slate-50 shadow-[3px_3px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'}
                                                `}
                                            >
                                                {pkg.popular && (
                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-slate-900 uppercase tracking-wider z-10 shadow-[2px_2px_0_0_#0f172a]">
                                                        Popular
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={`text-2xl font-black ${selectedPkg === pkg.id ? 'text-slate-900' : 'text-slate-900'}`}>
                                                        {pkg.credits}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedPkg === pkg.id ? 'text-slate-900' : 'text-slate-400'}`}>Credits</span>
                                                <div className={`mt-3 text-[10px] font-black px-2 py-1.5 w-full rounded-lg border-2 border-slate-900 ${selectedPkg === pkg.id ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                                                    <div className="truncate text-center">Rp {pkg.price.toLocaleString('id-ID')}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {packages.length > 4 && (
                                    <div className="flex items-center justify-center gap-2 mt-3 animate-bounce">
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={3} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Scroll untuk lainnya</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={!selectedPkg || loadingCheckout}
                            className="w-full py-3.5 px-6 bg-emerald-400 text-slate-900 border-4 border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:shadow-none active:translate-x-1.5 active:translate-y-1.5"
                        >
                            {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} /> : <CreditCard className="w-4 h-4" strokeWidth={3} />}
                            {loadingCheckout ? 'Memproses...' : 'Beli Sekarang'}
                        </button>

                        {/* Redeem Code Section */}
                        <div className="mt-6 pt-6 border-t-4 border-slate-100">
                            <div className="h-[48px] flex items-center text-center">
                                {!showRedeem ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowRedeem(true)}
                                        className="w-full h-full flex items-center justify-center gap-2 rounded-xl border-4 border-dashed border-slate-300 text-[10px] font-black text-slate-400 hover:text-indigo-500 hover:border-indigo-400 uppercase tracking-widest transition-colors"
                                    >
                                        <Gift className="w-4 h-4" strokeWidth={3} />
                                        Punya kode voucher?
                                    </button>
                                ) : (
                                    <div className="w-full h-full flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowRedeem(false)}
                                            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg border-4 border-slate-900 bg-white text-slate-400 hover:text-red-500 hover:bg-slate-50 shadow-[3px_3px_0_0_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1"
                                            title="Batal"
                                        >
                                            <X className="w-4 h-4" strokeWidth={3} />
                                        </button>
                                        <input
                                            type="text"
                                            value={redeemCode}
                                            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                                            placeholder="KODE VOUCHER"
                                            className="flex-1 min-w-0 h-10 px-3 bg-slate-50 border-4 border-slate-900 rounded-lg text-slate-900 font-mono font-black uppercase tracking-widest text-[10px] placeholder:text-slate-300 placeholder:font-sans focus:outline-none focus:bg-white shadow-[inset_2px_2px_0_0_rgba(15,23,42,0.1)]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleRedeem}
                                            disabled={!redeemCode.trim() || redeemLoading}
                                            className="h-10 px-4 bg-indigo-500 text-white border-4 border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed font-black rounded-lg flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest shadow-[3px_3px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 shrink-0"
                                        >
                                            {redeemLoading ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={3} /> : <Gift className="w-3 h-3" strokeWidth={3} />}
                                            Redeem
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-center text-[9px] font-black text-slate-400 mt-5 uppercase tracking-widest">
                            ⚡ Aman & Terpercaya via Payment Gateway.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
