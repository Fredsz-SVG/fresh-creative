'use client'

import { X, CreditCard, Wallet, Loader2, Gift } from 'lucide-react'
import { useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from '@/lib/toast'
import { fetchWithAuth } from '../../lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

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
    const [mounted, setMounted] = useState(false)
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
            const data = asObject(await res.json().catch(() => ({})))
            if (res.ok && data.ok === true) {
                const creditsReceived = typeof data.credits_received === 'number' ? data.credits_received : 0
                toast.success(`🎉 Berhasil! +${creditsReceived} credit ditambahkan.`)
                setRedeemCode('')
                setShowRedeem(false)
                handleCloseModal()
                if (onCreditChange) onCreditChange()
            } else {
                toast.error(asString(data.error) || 'Kode tidak valid.')
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
            const data = asObject(await res.json().catch(() => ({})))
            const invoiceUrl = asString(data.invoiceUrl)
            if (res.ok && invoiceUrl) {
                toast.success('Faktur pembayaran berhasil dibuat! Selesaikan pembayaran di bawah.')
                setCheckoutInvoiceUrl(invoiceUrl)
            } else {
                toast.error(asString(data.error) || 'Terjadi kesalahan saat memproses pembayaran')
            }
        } catch (error) {
            toast.error('Gagal membuat tagihan pembayaran')
        } finally {
            setLoadingCheckout(false)
        }
    }

    useLayoutEffect(() => {
        setMounted(true)
    }, [])

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
        }
    }, [isOpen])

    // Kunci scroll halaman belakang selama modal dibuka (termasuk fase iframe Xendit). Pakai isOpen saja
    // agar saat tutup, scroll selalu pulih meski state checkout internal tertinggal.
    useEffect(() => {
        if (!isOpen) return
        const html = document.documentElement
        const prevBody = document.body.style.overflow
        const prevHtml = html.style.overflow
        document.body.style.overflow = 'hidden'
        html.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevBody
            html.style.overflow = prevHtml
        }
    }, [isOpen])

    if (!isOpen || !mounted) return null

    const ui = (
        <>
            {/* Popup pembayaran Xendit di dalam halaman */}
            {checkoutInvoiceUrl && (
                <div className="fixed inset-0 z-[110] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Pembayaran Xendit">
                    <div className="flex items-center justify-between px-4 py-3 border-b-4 border-slate-900 bg-slate-50 dark:bg-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Selesaikan Pembayaran</h3>
                        </div>
                        <button
                            type="button"
                            onClick={handleCloseCheckoutPopup}
                            className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-slate-900 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-500 shadow-[#64748b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
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

            <div
                className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none bg-slate-900/40 dark:bg-black/50 backdrop-blur-md p-4"
                onClick={checkoutInvoiceUrl ? undefined : handleCloseModal}
            >
                <div
                    className="relative w-full max-w-sm max-h-[min(92dvh,calc(100dvh-2rem))] flex flex-col bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 rounded-[28px] shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between p-4 border-b-4 border-black dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400 dark:bg-amber-500 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-900 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b]">
                                <Wallet className="w-5 h-5" strokeWidth={3} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Top Up Credit</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Saldo:</p>
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded-md border-2 border-slate-200 dark:border-slate-600">{currentCredit} CREDITS</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleCloseModal}
                            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl border-2 border-black dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] active:shadow-none active:translate-x-1 active:translate-y-1"
                        >
                            <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>

                    {/* Body: scroll hanya di area grid paket jika lebih dari 4 item; scrollbar disembunyikan (no-scrollbar) */}
                    <div className="p-4 bg-white dark:bg-slate-900 overflow-hidden min-h-0 flex-1 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em] mb-2 shrink-0">Pilih Paket Credit</p>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 shrink-0">
                                <Loader2 className="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-spin" strokeWidth={3} />
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Memuat Paket...</span>
                            </div>
                        ) : (
                            <div
                                className={
                                    packages.length > 4
                                        ? 'mb-3 min-h-0 flex-1 flex flex-col overflow-hidden'
                                        : 'mb-3 shrink-0'
                                }
                            >
                                <div
                                    className={
                                        packages.length > 4
                                            ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-0.5 pt-3 pb-1 -mx-0.5'
                                            : 'pt-3 pb-1'
                                    }
                                >
                                    <div
                                        className={`grid gap-2 ${packages.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}
                                    >
                                        {packages.map((pkg) => (
                                            <button
                                                key={pkg.id}
                                                onClick={() => setSelectedPkg(pkg.id)}
                                                className={`
                                                    relative flex flex-col items-center justify-center p-2 rounded-[14px] border-[3px] transition-all duration-200
                                                    ${selectedPkg === pkg.id
                                                        ? 'border-slate-200 dark:border-slate-600 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b]'
                                                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'}
                                                `}
                                            >
                                                {pkg.popular && (
                                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 dark:bg-amber-500 text-slate-900 text-[8px] font-black px-1.5 py-px rounded-full border-2 border-slate-200 dark:border-slate-600 uppercase tracking-wider z-10 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b]">
                                                        Popular
                                                    </span>
                                                )}
                                                <span className={`text-lg font-black leading-none mt-0.5 ${selectedPkg === pkg.id ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                                                    {pkg.credits}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${selectedPkg === pkg.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`}>Credits</span>
                                                <div className={`mt-1.5 text-[9px] font-black px-1 py-1 w-full rounded-md border-2 border-slate-200 dark:border-slate-600 leading-tight ${selectedPkg === pkg.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                                    <div className="truncate text-center">Rp {pkg.price.toLocaleString('id-ID')}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={!selectedPkg || loadingCheckout}
                            className="w-full shrink-0 py-2.5 px-4 bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white border-2 border-black dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:shadow-none active:translate-x-1.5 active:translate-y-1.5"
                        >
                            {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} /> : <CreditCard className="w-4 h-4" strokeWidth={3} />}
                            {loadingCheckout ? 'Memproses...' : 'Beli Sekarang'}
                        </button>

                        {/* Redeem Code Section */}
                        <div className="mt-3 pt-3 border-t-2 border-slate-100 dark:border-slate-700 shrink-0">
                            <div className="h-10 flex items-center text-center">
                                {!showRedeem ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowRedeem(true)}
                                        className="w-full h-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-black text-slate-400 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 uppercase tracking-widest transition-colors"
                                    >
                                        <Gift className="w-4 h-4" strokeWidth={3} />
                                        Punya kode voucher?
                                    </button>
                                ) : (
                                    <div className="w-full h-full flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowRedeem(false)}
                                            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] active:shadow-none active:translate-x-1 active:translate-y-1"
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
                                            className="flex-1 min-w-0 h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono font-black uppercase tracking-widest text-[10px] placeholder:text-slate-300 dark:placeholder:text-slate-500 placeholder:font-sans focus:outline-none focus:bg-white dark:focus:bg-slate-700 shadow-[inset_2px_2px_0_0_rgba(15,23,42,0.1)]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleRedeem}
                                            disabled={!redeemCode.trim() || redeemLoading}
                                            className="h-10 px-4 bg-indigo-500 dark:bg-indigo-600 text-white border-2 border-slate-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-black rounded-lg flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 shrink-0"
                                        >
                                            {redeemLoading ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={3} /> : <Gift className="w-3 h-3" strokeWidth={3} />}
                                            Redeem
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

    return createPortal(ui, document.body)
}







