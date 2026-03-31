'use client'

import { useEffect, useRef, useState } from 'react'
import { Edit, Plus, Save, Trash2, X, Loader2, Check, Copy, Gift, ToggleLeft, ToggleRight, Clock, ChevronRight, Layout, Zap, Hash, Calendar, AlertCircle, Users, Star } from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '../../../lib/api-client'

interface CreditPackage {
    id: string
    credits: number
    price: number
    popular: boolean
}

interface RedeemCode {
    id: string
    code: string
    credits: number
    max_uses: number
    used_count: number
    is_active: boolean
    expires_at: string | null
    created_at: string
    redeem_history?: { id: string; user_id: string; credits_received: number; redeemed_at: string }[]
}

const PackageForm = ({ pkg, onSave, onCancel }: { pkg: Partial<CreditPackage> | null, onSave: (p: Partial<CreditPackage>) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState<Partial<CreditPackage>>({
        id: pkg?.id,
        credits: pkg?.credits ?? 0,
        price: pkg?.price ?? 0,
        popular: pkg?.popular ?? false,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155] p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{pkg?.id ? 'Edit Package' : 'New Package'}</h2>
                    <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={24} className="text-slate-900 dark:text-white" strokeWidth={3} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Credits Amount</label>
                            <input
                                name="credits"
                                type="number"
                                value={formData.credits}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Price (IDR)</label>
                            <input
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
                                required
                            />
                        </div>
                        <div className="p-4 border-4 border-slate-900 dark:border-slate-700 rounded-2xl bg-amber-50 dark:bg-slate-800 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]">
                            <label className="flex items-center gap-4 cursor-pointer select-none">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.popular}
                                        onChange={handleChange}
                                        name="popular"
                                        className="sr-only peer"
                                    />
                                    <div className="w-12 h-6 bg-slate-200 dark:bg-slate-600 border-2 border-slate-900 dark:border-slate-700 rounded-full peer-checked:bg-amber-400 dark:peer-checked:bg-amber-500 transition-colors" />
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-slate-300 border-2 border-slate-900 dark:border-slate-700 rounded-full transition-transform peer-checked:translate-x-6" />
                                </div>
                                <span className="text-sm text-slate-900 dark:text-white font-black flex items-center gap-2">
                                    <Star size={16} className="text-amber-500 fill-amber-500" />
                                    Mark as Popular
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] active:shadow-none">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-4 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:shadow-none">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function AdminCreditSettingsPage() {
    const [packages, setPackages] = useState<CreditPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPackage, setEditingPackage] = useState<Partial<CreditPackage> | null>(null)
    const [activeTab, setActiveTab] = useState<'packages' | 'redeem'>('packages')

    // Delete confirmation state
    const [deletePrompt, setDeletePrompt] = useState<{ id: string, type: 'package' | 'redeem', title: string, text: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Redeem code state
    const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([])
    const [loadingRedeem, setLoadingRedeem] = useState(true)
    const [showCreateRedeem, setShowCreateRedeem] = useState(false)
    const [newCode, setNewCode] = useState({ code: '', credits: 10, max_uses: 1, expires_at: '' })

    const cacheKeyPackages = 'admin_credit_packages_v1'
    const cacheKeyRedeem = 'admin_redeem_codes_v1'
    const hasCachePackagesRef = useRef(false)
    const hasCacheRedeemRef = useRef(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const pkgRaw = window.sessionStorage.getItem(cacheKeyPackages)
            const redeemRaw = window.sessionStorage.getItem(cacheKeyRedeem)
            if (pkgRaw) {
                const parsed = JSON.parse(pkgRaw) as { ts: number; data: CreditPackage[] }
                if (Array.isArray(parsed?.data)) {
                    setPackages(parsed.data)
                    setLoading(false)
                    hasCachePackagesRef.current = true
                }
            }
            if (redeemRaw) {
                const parsed = JSON.parse(redeemRaw) as { ts: number; data: RedeemCode[] }
                if (Array.isArray(parsed?.data)) {
                    setRedeemCodes(parsed.data)
                    setLoadingRedeem(false)
                    hasCacheRedeemRef.current = true
                }
            }
        } catch {
            // ignore
        }
    }, [])

    const fetchPackages = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await fetchWithAuth(`/api/credits/packages?t=${Date.now()}`)
            if (!res.ok) throw new Error('Failed to fetch packages')
            const data = (await res.json()) as unknown
            setPackages(Array.isArray(data) ? (data as CreditPackage[]) : [])
            if (typeof window !== 'undefined') {
                try {
                    window.sessionStorage.setItem(cacheKeyPackages, JSON.stringify({ ts: Date.now(), data }))
                } catch {
                    // ignore
                }
            }
        } catch (err) {
            console.error(err)
            toast.error('Gagal memuat paket')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPackages(hasCachePackagesRef.current)
        fetchRedeemCodes(hasCacheRedeemRef.current)
    }, [])

    const handleSave = async (pkg: Partial<CreditPackage>) => {
        const method = pkg.id ? 'PUT' : 'POST'
        try {
            const res = await fetchWithAuth('/api/credits/packages', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkg),
            })
            if (!res.ok) throw new Error(await res.text())
            setEditingPackage(null)
            toast.success(pkg.id ? 'Paket diperbarui' : 'Paket dibuat')
            fetchPackages(true)
        } catch (err) {
            console.error('Save failed:', err)
            toast.error('Gagal menyimpan paket')
        }
    }

    const handleDelete = (id: string, creditsText?: number) => {
        setDeletePrompt({
            id,
            type: 'package',
            title: 'Hapus Paket Credit',
            text: `Yakin ingin menghapus paket kredit ${creditsText ? `(${creditsText} credits)` : ''} ini? Tindakan ini tidak dapat dibatalkan.`
        })
    }

    // ── Redeem Code Functions ──

    const fetchRedeemCodes = async (silent = false) => {
        if (!silent) setLoadingRedeem(true)
        try {
            const res = await fetchWithAuth(`/api/credits/redeem?t=${Date.now()}`)
            if (!res.ok) throw new Error('Failed to fetch redeem codes')
            const data = (await res.json()) as unknown
            setRedeemCodes(Array.isArray(data) ? (data as RedeemCode[]) : [])
            if (typeof window !== 'undefined') {
                try {
                    window.sessionStorage.setItem(cacheKeyRedeem, JSON.stringify({ ts: Date.now(), data }))
                } catch {
                    // ignore
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingRedeem(false)
        }
    }

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
        return code
    }

    const handleCreateRedeem = async () => {
        const code = newCode.code.trim() || generateRandomCode()

        let expiresAtISO = null;
        if (newCode.expires_at) {
            expiresAtISO = new Date(newCode.expires_at).toISOString();
        }

        try {
            const res = await fetchWithAuth('/api/credits/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    credits: newCode.credits,
                    max_uses: newCode.max_uses,
                    expires_at: expiresAtISO,
                }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
            if (!res.ok) throw new Error(data?.error || 'Gagal membuat kode')
            toast.success(`Kode ${data?.code ?? code} berhasil dibuat!`)
            setShowCreateRedeem(false)
            setNewCode({ code: '', credits: 10, max_uses: 1, expires_at: '' })
            fetchRedeemCodes(true)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membuat kode')
        }
    }

    const handleToggleRedeem = async (item: RedeemCode) => {
        try {
            const res = await fetchWithAuth('/api/credits/redeem', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
            })
            if (!res.ok) throw new Error(await res.text())
            toast.success(item.is_active ? 'Kode dinonaktifkan' : 'Kode diaktifkan')
            fetchRedeemCodes(true)
        } catch (err) {
            toast.error('Gagal mengubah status')
        }
    }

    const handleDeleteRedeem = (id: string, code: string) => {
        setDeletePrompt({
            id,
            type: 'redeem',
            title: 'Hapus Kode Redeem',
            text: `Yakin ingin menghapus kode redeem "${code}"? Tindakan ini tidak dapat dibatalkan.`
        })
    }

    const executeDelete = async () => {
        if (!deletePrompt) return
        setIsDeleting(true)
        try {
            if (deletePrompt.type === 'package') {
                const res = await fetchWithAuth('/api/credits/packages', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deletePrompt.id }),
                })
                if (!res.ok) throw new Error(await res.text())
                toast.success('Paket dihapus')
                fetchPackages(true)
            } else if (deletePrompt.type === 'redeem') {
                const res = await fetchWithAuth('/api/credits/redeem', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deletePrompt.id }),
                })
                if (!res.ok) throw new Error(await res.text())
                toast.success('Kode dihapus')
                fetchRedeemCodes(true)
            }
        } catch (err) {
            console.error('Delete failed:', err)
            toast.error(`Gagal menghapus ${deletePrompt.type === 'package' ? 'paket' : 'kode'}`)
        } finally {
            setIsDeleting(false)
            setDeletePrompt(null)
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success('Kode disalin!')
    }

    return (
        <div className="p-0 sm:p-0 md:p-0">
            {editingPackage && (
                <PackageForm pkg={editingPackage} onSave={handleSave} onCancel={() => setEditingPackage(null)} />
            )}

            {/* Create Redeem Code Modal */}
            {showCreateRedeem && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155] p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Buat Kode Redeem</h2>
                            <button onClick={() => setShowCreateRedeem(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} className="text-slate-900 dark:text-white" strokeWidth={3} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Kode Voucher</label>
                                <div className="flex gap-2">
                                    <input
                                        value={newCode.code}
                                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                        placeholder="AUTO-GENERATE"
                                        className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] focus:shadow-none uppercase font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewCode({ ...newCode, code: generateRandomCode() })}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-[10px] font-black hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all"
                                    >
                                        GENERATE
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Jumlah Credit</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={newCode.credits}
                                        onChange={(e) => setNewCode({ ...newCode, credits: Number(e.target.value) })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Limit Pakai</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={newCode.max_uses}
                                        onChange={(e) => setNewCode({ ...newCode, max_uses: Number(e.target.value) })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1.5 block">Kadaluarsa (Opsional)</label>
                                <input
                                    type="datetime-local"
                                    value={newCode.expires_at}
                                    onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8">
                            <button
                                type="button"
                                onClick={() => setShowCreateRedeem(false)}
                                className="flex-1 px-6 py-4 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] active:shadow-none"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateRedeem}
                                className="flex-1 px-6 py-4 bg-purple-400 dark:bg-purple-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:shadow-none flex items-center justify-center gap-2"
                            >
                                <Gift size={18} strokeWidth={3} />
                                Buat Kode
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletePrompt && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md" onClick={() => !isDeleting && setDeletePrompt(null)}>
                    <div
                        className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155] p-8 w-full max-w-sm animate-in fade-in zoom-in duration-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-900/30 border-4 border-red-100 dark:border-red-800 flex items-center justify-center text-red-500 dark:text-red-400 mb-6 mx-auto">
                            <Trash2 size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">{deletePrompt.title}</h3>
                        <p className="text-sm font-bold text-slate-400 dark:text-slate-300 text-center mb-8">{deletePrompt.text}</p>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setDeletePrompt(null)}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-4 border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] active:shadow-none"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={executeDelete}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-4 bg-red-500 dark:bg-red-600 text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:shadow-none flex justify-center items-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:justify-between lg:items-end">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Credit Settings</h1>
                    <p className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-300">Atur harga paket top up & management voucher code promo.</p>
                </div>
                {activeTab === 'packages' ? (
                    <button
                        onClick={() => setEditingPackage({})}
                        className="flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-none text-sm md:text-base"
                    >
                        <Plus size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                        Add Package
                    </button>
                ) : (
                    <button
                        onClick={() => setShowCreateRedeem(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-purple-400 dark:bg-purple-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-none text-sm md:text-base"
                    >
                        <Gift size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                        Buat Kode Redeem
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-8 grid grid-cols-2 gap-2 md:flex md:flex-nowrap md:gap-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('packages')}
                    className={`flex items-center justify-center gap-2 md:gap-3 px-2 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-base font-black border-4 border-slate-900 dark:border-slate-700 transition-all active:scale-95 ${activeTab === 'packages' ? 'bg-violet-400 dark:bg-violet-600 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155]' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none'}`}
                >
                    <Layout className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
                    <span>Packages</span>
                    <span className="px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[9px] md:text-xs rounded-lg border-2 border-slate-900 dark:border-slate-600 ml-0.5 md:ml-1">
                        {packages.length}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('redeem')}
                    className={`flex items-center justify-center gap-2 md:gap-3 px-2 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-base font-black border-4 border-slate-900 dark:border-slate-700 transition-all active:scale-95 ${activeTab === 'redeem' ? 'bg-purple-400 dark:bg-purple-600 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155]' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none'}`}
                >
                    <Hash className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
                    <span className="truncate">Redeems</span>
                    <span className="px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[9px] md:text-xs rounded-lg border-2 border-slate-900 dark:border-slate-600 ml-0.5 md:ml-1">
                        {redeemCodes.length}
                    </span>
                </button>
            </div>

            {activeTab === 'packages' ? (
                <>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-6 md:p-8 animate-pulse shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[8px_8px_0_0_#0f172a] dark:md:shadow-[8px_8px_0_0_#334155]">
                                    <div className="space-y-4">
                                        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-16" />
                                        <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded-lg w-12" />
                                        <div className="h-8 bg-slate-50 dark:bg-slate-800 rounded-xl w-full mt-2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-12">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="group relative bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[8px_8px_0_0_#0f172a] dark:md:shadow-[8px_8px_0_0_#334155] hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#334155] md:hover:shadow-[12px_12px_0_0_#0f172a] dark:md:hover:shadow-[12px_12px_0_0_#334155] hover:-translate-x-1 hover:-translate-y-1 transition-all overflow-hidden">
                                    <div className="flex justify-between items-start mb-4 md:mb-6">
                                        <div>
                                            <p className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{pkg.credits}</p>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[0.2em]">Credits</p>
                                        </div>
                                        {pkg.popular && (
                                            <span className="bg-amber-400 dark:bg-amber-600 text-slate-900 dark:text-white text-[9px] md:text-[10px] font-black px-2 py-1 md:px-3 md:py-1.5 rounded-full uppercase tracking-widest border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                                                Popular
                                            </span>
                                        )}
                                    </div>

                                    <div className="pt-4 md:pt-6 border-t-[3px] md:border-t-4 border-slate-100 dark:border-slate-700">
                                        <p className="text-xl md:text-2xl font-black text-violet-600 dark:text-violet-400">Rp {pkg.price.toLocaleString('id-ID')}</p>
                                    </div>

                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1.5 md:gap-2 lg:opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all scale-90 md:scale-100">
                                        <button onClick={() => setEditingPackage(pkg)} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-amber-300 dark:bg-amber-600 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all active:scale-95">
                                            <Edit size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={3} />
                                        </button>
                                        <button onClick={() => handleDelete(pkg.id, pkg.credits)} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-red-400 dark:bg-red-600 border-2 border-slate-900 dark:border-slate-700 text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all active:scale-95">
                                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {loadingRedeem ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-5 md:p-8 animate-pulse shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155]">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-3">
                                            <div className="h-5 md:h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-32 md:w-40" />
                                            <div className="h-3 md:h-4 bg-slate-50 dark:bg-slate-800 rounded-lg w-48 md:w-64" />
                                        </div>
                                        <div className="h-8 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-20 md:w-24" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : redeemCodes.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-8 md:p-16 text-center shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] md:shadow-[12px_12px_0_0_#0f172a] dark:md:shadow-[12px_12px_0_0_#334155]">
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 md:mb-6 text-slate-200 dark:text-slate-600">
                                <Gift className="w-8 h-8 md:w-12 md:h-12" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">Belum ada kode redeem.</h3>
                            <p className="text-xs md:text-base text-slate-400 dark:text-slate-300 font-bold">Klik &quot;Buat Kode Redeem&quot; untuk mencetak voucher baru.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-20">
                            {redeemCodes.map((item) => {
                                const isExpired = item.expires_at && new Date(item.expires_at) < new Date()
                                const isFull = item.used_count >= item.max_uses
                                const statusColor = !item.is_active || isExpired
                                    ? 'red'
                                    : isFull
                                        ? 'amber'
                                        : 'emerald'
                                const statusText = !item.is_active
                                    ? 'Nonaktif'
                                    : isExpired
                                        ? 'Kadaluarsa'
                                        : isFull
                                            ? 'Habis'
                                            : 'Aktif'

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-5 md:p-8 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#334155] md:hover:shadow-[10px_10px_0_0_#0f172a] dark:md:hover:shadow-[10px_10px_0_0_#334155] hover:-translate-x-1 hover:-translate-y-1 ${!item.is_active || isExpired || isFull ? 'opacity-60 grayscale-[0.5]' : ''
                                            }`}
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-6">
                                                    <div className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg md:rounded-xl font-mono text-base md:text-2xl font-black tracking-[0.1em] md:tracking-[0.2em] shadow-[3px_3px_0_0_#a855f7] dark:shadow-[4px_4px_0_0_#a855f7]">
                                                        {item.code}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => copyCode(item.code)}
                                                            className="p-2 md:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none"
                                                            title="Copy Code"
                                                        >
                                                            <Copy size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                                                        </button>
                                                        <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest px-3 py-1 md:px-4 md:py-1.5 rounded-full border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] md:shadow-[3px_3px_0_0_#0f172a] dark:md:shadow-[3px_3px_0_0_#334155] ${statusColor === 'emerald' ? 'bg-emerald-300 dark:bg-emerald-700 text-slate-900 dark:text-white' :
                                                            statusColor === 'amber' ? 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white' :
                                                                'bg-red-400 dark:bg-red-600 text-white'
                                                            }`}>
                                                            {statusText}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                                    <div className="flex items-center gap-2 md:gap-3">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-purple-100 dark:bg-purple-900/50 border-2 border-slate-900 dark:border-slate-700 flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                                                            <Gift className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Bonus</p>
                                                            <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white">{item.credits} Credits</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 md:gap-3">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-orange-100 dark:bg-orange-900/50 border-2 border-slate-900 dark:border-slate-700 flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                                                            <Users className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Usage</p>
                                                            <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white">{item.used_count}/{item.max_uses}</p>
                                                        </div>
                                                    </div>

                                                    {item.expires_at && (
                                                        <div className="flex items-center gap-2 md:gap-3 col-span-2 md:col-span-1">
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-slate-900 dark:border-slate-700 flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                                                                <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Expiry</p>
                                                                <p className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                                                                    {new Date(item.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex lg:flex-col items-center justify-end gap-3 md:gap-4 lg:pl-8 lg:border-l-4 lg:border-slate-100 dark:lg:border-slate-700 shrink-0 mt-2 lg:mt-0">
                                                <button
                                                    onClick={() => handleToggleRedeem(item)}
                                                    className={`flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:scale-95 ${item.is_active ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-100 dark:bg-slate-800'
                                                        }`}
                                                    title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {item.is_active ? <ToggleRight size={22} className="md:w-7 md:h-7 text-slate-900 dark:text-white" strokeWidth={2.5} /> : <ToggleLeft size={22} className="md:w-7 md:h-7 text-slate-900 dark:text-white" strokeWidth={2.5} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRedeem(item.id, item.code)}
                                                    className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-red-400 dark:bg-red-600 border-2 border-slate-900 dark:border-slate-700 text-white shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:scale-95"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
