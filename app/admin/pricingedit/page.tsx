'use client'

import { useEffect, useState } from 'react'
import { Edit, Plus, Save, Trash2, X } from 'lucide-react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'

interface PricingPackage {
  id: string
  name: string
  price_per_student: number
  min_students: number
  features: string[]
}

interface AiFeaturePricing {
  id: string
  feature_slug: string
  credits_per_use: number
}

const AI_FEATURE_LABELS: Record<string, string> = {
  tryon: 'Try On',
  pose: 'Pose',
  photogroup: 'Photo Group',
  phototovideo: 'Photo to Video',
  image_remove_bg: 'Image Editor - Remove BG',
}

const PackageForm = ({ pkg, onSave, onCancel }: { pkg: Partial<PricingPackage> | null, onSave: (p: Partial<PricingPackage>) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<PricingPackage>>(pkg || {
    name: '',
    price_per_student: 0,
    min_students: 0,
    features: [],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'features') {
      setFormData({ ...formData, features: value.split('\n') })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-app mb-4">{pkg?.id ? 'Edit Package' : 'Create New Package'}</h2>
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Package Name" className="w-full p-2 bg-gray-700 rounded" required />
            <input name="price_per_student" type="number" value={formData.price_per_student} onChange={handleChange} placeholder="Price per Student" className="w-full p-2 bg-gray-700 rounded" required />
            <input name="min_students" type="number" value={formData.min_students} onChange={handleChange} placeholder="Min. Students" className="w-full p-2 bg-gray-700 rounded" required />
            <textarea name="features" value={formData.features?.join('\n')} onChange={handleChange} placeholder="Features (one per line)" className="w-full p-2 bg-gray-700 rounded" rows={4} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 flex items-center gap-2"><X size={18} /> Cancel</button>
            <button type="submit" className="px-4 py-2 bg-lime-600 rounded-lg hover:bg-lime-500 flex items-center gap-2"><Save size={18} /> Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PricingEditPage() {
  const [packages, setPackages] = useState<PricingPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<Partial<PricingPackage> | null>(null)
  const [activeTab, setActiveTab] = useState<'yearbook' | 'ai'>('yearbook')
  const [aiPricing, setAiPricing] = useState<AiFeaturePricing[]>([])
  const [loadingAi, setLoadingAi] = useState(true)
  const [editingAi, setEditingAi] = useState<AiFeaturePricing | null>(null)

  const fetchPackages = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing')
      if (!res.ok) throw new Error('Failed to fetch packages')
      setPackages(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAiPricing = async () => {
    setLoadingAi(true)
    try {
      const res = await fetch(`/api/ai/pricing?t=${Date.now()}`)
      if (!res.ok) throw new Error('Failed to fetch AI pricing')
      setAiPricing(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAi(false)
    }
  }

  useEffect(() => {
    fetchPackages()
    fetchAiPricing()
  }, [])

  const handleSave = async (pkg: Partial<PricingPackage>) => {
    const method = pkg.id ? 'PUT' : 'POST'
    try {
      const res = await fetch('/api/pricing', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditingPackage(null)
      fetchPackages()
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleSaveAi = async (item: AiFeaturePricing) => {
    try {
      const res = await fetch('/api/ai/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          feature_slug: item.feature_slug,
          credits_per_use: item.credits_per_use,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditingAi(null)
      fetchAiPricing()
    } catch (err) {
      console.error('Save AI pricing failed:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return
    try {
      const res = await fetch('/api/pricing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(await res.text())
      fetchPackages()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="p-0 sm:p-0 md:p-0">
      {editingPackage && (
        <PackageForm pkg={editingPackage} onSave={handleSave} onCancel={() => setEditingPackage(null)} />
      )}
      {editingAi && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-app mb-4">
              Edit AI Pricing - {AI_FEATURE_LABELS[editingAi.feature_slug] ?? editingAi.feature_slug}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveAi(editingAi)
              }}
            >
              <div className="space-y-4">
                <input
                  name="credits_per_use"
                  type="number"
                  min={0}
                  value={editingAi.credits_per_use}
                  onChange={(e) =>
                    setEditingAi({
                      ...editingAi,
                      credits_per_use: Number(e.target.value),
                    })
                  }
                  placeholder="Credit per generate"
                  className="w-full p-2 bg-gray-700 rounded"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAi(null)}
                  className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 flex items-center gap-2"
                >
                  <X size={18} /> Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-lime-600 rounded-lg hover:bg-lime-500 flex items-center gap-2"
                >
                  <Save size={18} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
        <DashboardTitle
          title="Pricing Edit"
          subtitle="Kelola paket harga yearbook."
        />
        <button onClick={() => setEditingPackage({})} className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 touch-manipulation">
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="mb-4 flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('yearbook')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'yearbook'
              ? 'text-app border-b-2 border-app'
              : 'text-muted hover:text-app'
          }`}
        >
          Paket Yearbook
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'ai'
              ? 'text-app border-b-2 border-app'
              : 'text-muted hover:text-app'
          }`}
        >
          AI Pricing
        </button>
      </div>

      {activeTab === 'yearbook' ? (
        loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white/[0.03] p-4 rounded-lg flex justify-between items-start border border-white/10 animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-white/10 rounded" />
                  <div className="h-4 w-64 bg-white/5 rounded" />
                  <div className="h-4 w-full bg-white/5 rounded mt-2" />
                </div>
                <div className="h-8 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white/[0.03] p-4 rounded-lg flex justify-between items-start border border-white/10"
              >
                <div>
                  <h3 className="font-bold text-lg text-app">{pkg.name}</h3>
                  <p className="text-muted">
                    Rp {pkg.price_per_student.toLocaleString('id-ID')} / student (min. {pkg.min_students})
                  </p>
                  <ul className="text-sm text-muted mt-2 list-disc list-inside">
                    {pkg.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingPackage(pkg)}
                    className="p-2 text-yellow-400 hover:text-yellow-300"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : loadingAi ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/[0.03] p-4 rounded-lg flex justify-between items-center border border-white/10 animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-5 w-40 bg-white/10 rounded" />
                <div className="h-4 w-32 bg-white/5 rounded" />
              </div>
              <div className="h-8 w-20 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {aiPricing.map((item) => (
            <div
              key={item.id}
              className="bg-white/[0.03] p-4 rounded-lg flex justify-between items-center border border-white/10"
            >
              <div>
                <h3 className="font-bold text-lg text-app">
                  {AI_FEATURE_LABELS[item.feature_slug] ?? item.feature_slug}
                </h3>
                <p className="text-muted text-sm">
                  {item.credits_per_use} credit / generate
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingAi(item)}
                  className="p-2 text-yellow-400 hover:text-yellow-300"
                >
                  <Edit size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
