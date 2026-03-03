'use client'

import { useEffect, useState } from 'react'
import { Edit, Plus, Save, Trash2, X, Loader2, Check, Copy, Gift, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold text-app mb-4">{pkg?.id ? 'Edit Package' : 'Create New Package'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Credits Amount</label>
                            <input
                                name="credits"
                                type="number"
                                value={formData.credits}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Price (IDR)</label>
                            <input
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime-500"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="popular"
                                name="popular"
                                type="checkbox"
                                checked={formData.popular}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-600 text-lime-600 focus:ring-lime-500 bg-gray-700"
                            />
                            <label htmlFor="popular" className="text-sm text-gray-300">Mark as Popular</label>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onCancel} className="px-4 py-2 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 flex items-center gap-2 text-sm font-medium">
                            <X size={16} /> Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-lime-600 rounded-xl hover:bg-lime-500 text-white flex items-center gap-2 text-sm font-medium">
                            <Save size={16} /> Save
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

    // Redeem code state
    const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([])
    const [loadingRedeem, setLoadingRedeem] = useState(true)
    const [showCreateRedeem, setShowCreateRedeem] = useState(false)
    const [newCode, setNewCode] = useState({ code: '', credits: 10, max_uses: 1, expires_at: '' })

    const fetchPackages = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await fetch(`/api/credits/packages?t=${Date.now()}`)
            if (!res.ok) throw new Error('Failed to fetch packages')
            const data = await res.json()
            setPackages(data)
        } catch (err) {
            console.error(err)
            toast.error('Gagal memuat paket')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPackages()
        fetchRedeemCodes()

        const channel = supabase
            .channel('realtime-admin-credits')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credit_packages' },
                () => {
                    fetchPackages(true)
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'redeem_codes' },
                () => {
                    fetchRedeemCodes(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleSave = async (pkg: Partial<CreditPackage>) => {
        const method = pkg.id ? 'PUT' : 'POST'
        try {
            const res = await fetch('/api/credits/packages', {
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

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus paket ini?')) return
        try {
            const res = await fetch('/api/credits/packages', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })
            if (!res.ok) throw new Error(await res.text())
            toast.success('Paket dihapus')
            fetchPackages(true)
        } catch (err) {
            console.error('Delete failed:', err)
            toast.error('Gagal menghapus paket')
        }
    }

    // ── Redeem Code Functions ──

    const fetchRedeemCodes = async (silent = false) => {
        if (!silent) setLoadingRedeem(true)
        try {
            const res = await fetch(`/api/credits/redeem?t=${Date.now()}`)
            if (!res.ok) throw new Error('Failed to fetch redeem codes')
            setRedeemCodes(await res.json())
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

        // Convert datetime-local to ISO string to preserve local timezone properly when sending
        let expiresAtISO = null;
        if (newCode.expires_at) {
            expiresAtISO = new Date(newCode.expires_at).toISOString();
        }

        try {
            const res = await fetch('/api/credits/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    credits: newCode.credits,
                    max_uses: newCode.max_uses,
                    expires_at: expiresAtISO,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gagal membuat kode')
            toast.success(`Kode ${data.code} berhasil dibuat!`)
            setShowCreateRedeem(false)
            setNewCode({ code: '', credits: 10, max_uses: 1, expires_at: '' })
            fetchRedeemCodes(true)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membuat kode')
        }
    }

    const handleToggleRedeem = async (item: RedeemCode) => {
        try {
            const res = await fetch('/api/credits/redeem', {
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

    const handleDeleteRedeem = async (id: string) => {
        if (!confirm('Yakin ingin menghapus kode redeem ini?')) return
        try {
            const res = await fetch('/api/credits/redeem', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })
            if (!res.ok) throw new Error(await res.text())
            toast.success('Kode dihapus')
            fetchRedeemCodes(true)
        } catch (err) {
            toast.error('Gagal menghapus kode')
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
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-app mb-4">Buat Kode Redeem</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Kode (kosongkan untuk auto-generate)</label>
                                <div className="flex gap-2">
                                    <input
                                        value={newCode.code}
                                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                        placeholder="AUTO-GENERATE"
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white uppercase tracking-wider font-mono focus:outline-none focus:border-lime-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewCode({ ...newCode, code: generateRandomCode() })}
                                        className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:bg-white/20 text-xs font-medium"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Jumlah Credit</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={newCode.credits}
                                    onChange={(e) => setNewCode({ ...newCode, credits: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Maks. Pemakaian</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={newCode.max_uses}
                                    onChange={(e) => setNewCode({ ...newCode, max_uses: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Kadaluarsa (opsional)</label>
                                <input
                                    type="datetime-local"
                                    value={newCode.expires_at}
                                    onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-lime-500"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCreateRedeem(false)}
                                className="px-4 py-2 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 flex items-center gap-2 text-sm font-medium"
                            >
                                <X size={16} /> Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateRedeem}
                                className="px-4 py-2 bg-lime-600 rounded-xl hover:bg-lime-500 text-white flex items-center gap-2 text-sm font-medium"
                            >
                                <Gift size={16} /> Buat Kode
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
                <DashboardTitle
                    title="Credit Settings"
                    subtitle="Atur harga paket top up & kode redeem credit."
                />
                {activeTab === 'packages' ? (
                    <button
                        onClick={() => setEditingPackage({})}
                        className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 touch-manipulation"
                    >
                        <Plus size={18} /> Add Package
                    </button>
                ) : (
                    <button
                        onClick={() => setShowCreateRedeem(true)}
                        className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 touch-manipulation"
                    >
                        <Gift size={18} /> Buat Kode Redeem
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-4 flex border-b border-white/10">
                <button
                    type="button"
                    onClick={() => setActiveTab('packages')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'packages'
                        ? 'text-app border-b-2 border-app'
                        : 'text-muted hover:text-app'
                        }`}
                >
                    Credit Packages
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('redeem')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'redeem'
                        ? 'text-app border-b-2 border-app'
                        : 'text-muted hover:text-app'
                        }`}
                >
                    Redeem Codes
                </button>
            </div>

            {activeTab === 'packages' ? (
                <>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 animate-pulse">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-2">
                                            <div className="h-8 w-16 bg-white/10 rounded" />
                                            <div className="h-3 w-14 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <div className="h-6 w-24 bg-white/10 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-lime-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-3xl font-bold text-white">{pkg.credits}</p>
                                            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Credits</p>
                                        </div>
                                        {pkg.popular && (
                                            <span className="bg-lime-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Popular
                                            </span>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-lg font-semibold text-lime-400">Rp {pkg.price.toLocaleString('id-ID')}</p>
                                    </div>

                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingPackage(pkg)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(pkg.id)} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400">
                                            <Trash2 size={16} />
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
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 animate-pulse">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-2">
                                            <div className="h-6 w-32 bg-white/10 rounded" />
                                            <div className="h-4 w-48 bg-white/5 rounded" />
                                        </div>
                                        <div className="h-8 w-20 bg-white/5 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : redeemCodes.length === 0 ? (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center">
                            <Gift className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Belum ada kode redeem.</p>
                            <p className="text-gray-600 text-xs mt-1">Klik &quot;Buat Kode Redeem&quot; untuk memulai.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {redeemCodes.map((item) => {
                                const isExpired = item.expires_at && new Date(item.expires_at) < new Date()
                                const isFull = item.used_count >= item.max_uses
                                const statusColor = !item.is_active || isExpired
                                    ? 'text-red-400'
                                    : isFull
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
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
                                        className={`bg-white/[0.03] border rounded-2xl p-4 sm:p-5 transition-colors ${item.is_active && !isExpired && !isFull
                                            ? 'border-white/10 hover:border-purple-500/50'
                                            : 'border-white/5 opacity-60'
                                            }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-lg sm:text-xl font-bold font-mono text-white tracking-widest">
                                                        {item.code}
                                                    </code>
                                                    <button
                                                        onClick={() => copyCode(item.code)}
                                                        className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                                        title="Copy"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor === 'text-emerald-400'
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : statusColor === 'text-amber-400'
                                                            ? 'bg-amber-500/20 text-amber-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                                                    <span>🎁 <strong className="text-purple-400">{item.credits}</strong> credit</span>
                                                    <span>👥 {item.used_count}/{item.max_uses} dipakai</span>
                                                    {item.expires_at && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(item.expires_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleToggleRedeem(item)}
                                                    className={`p-2 rounded-lg transition-colors ${item.is_active
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                                        }`}
                                                    title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRedeem(item.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
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
