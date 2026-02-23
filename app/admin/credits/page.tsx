'use client'

import { useEffect, useState } from 'react'
import { Edit, Plus, Save, Trash2, X, Loader2, Check } from 'lucide-react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface CreditPackage {
    id: string
    credits: number
    price: number
    popular: boolean
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

    const fetchPackages = async () => {
        setLoading(true)
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

        const channel = supabase
            .channel('realtime-admin-packages')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credit_packages' },
                () => {
                    fetchPackages()
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
            fetchPackages()
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
            fetchPackages()
        } catch (err) {
            console.error('Delete failed:', err)
            toast.error('Gagal menghapus paket')
        }
    }

    return (
        <div className="p-0 sm:p-0 md:p-0">
            {editingPackage && (
                <PackageForm pkg={editingPackage} onSave={handleSave} onCancel={() => setEditingPackage(null)} />
            )}
            <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
                <DashboardTitle
                    title="Credit Settings"
                    subtitle="Atur harga dan paket top up credit."
                />
                <button
                    onClick={() => setEditingPackage({})}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 touch-manipulation"
                >
                    <Plus size={18} /> Add Package
                </button>
            </div>

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
        </div>
    )
}
