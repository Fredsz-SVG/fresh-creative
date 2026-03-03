'use client'

import { useEffect, useState } from 'react'
import { Edit, Plus, Save, Trash2, X, Book, Sparkles, Star } from 'lucide-react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'

interface PricingPackage {
  id: string
  name: string
  price_per_student: number
  min_students: number
  features: string[]
  flipbook_enabled: boolean
  ai_labs_features: string[]
  is_popular: boolean
}

interface AiFeaturePricing {
  id: string
  feature_slug: string
  credits_per_use: number
  credits_per_unlock: number
}

const AI_FEATURE_LABELS: Record<string, string> = {
  tryon: 'Try On',
  pose: 'Pose',
  photogroup: 'Photo Group',
  phototovideo: 'Photo to Video',
  image_remove_bg: 'Image Editor - Remove BG',
  flipbook_unlock: 'Flipbook Unlock',
}

// Slugs yang punya biaya generate (bukan unlock-only)
const GENERATE_SLUGS = new Set(['tryon', 'pose', 'photogroup', 'phototovideo', 'image_remove_bg'])

const PackageForm = ({ pkg, onSave, onCancel }: { pkg: Partial<PricingPackage> | null, onSave: (p: Partial<PricingPackage>) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<PricingPackage>>(pkg || {
    name: '',
    price_per_student: 0,
    min_students: 0,
    features: [],
    flipbook_enabled: false,
    ai_labs_features: [],
    is_popular: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (name === 'features') {
      setFormData({ ...formData, features: value.split('\n') })
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: Number(value) })
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
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!formData.flipbook_enabled}
                  onChange={(e) => setFormData({ ...formData, flipbook_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-600 rounded-full peer-checked:bg-lime-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-gray-300">Flipbook Enabled</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-600 rounded-full peer-checked:bg-amber-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-gray-300">Popular Badge</span>
            </label>
            <div>
              <p className="text-sm text-gray-300 mb-2">AI Labs Features</p>
              <div className="space-y-2 pl-1">
                {Object.entries(AI_FEATURE_LABELS).map(([slug, label]) => (
                  <label key={slug} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(formData.ai_labs_features ?? []).includes(slug)}
                      onChange={(e) => {
                        const current = formData.ai_labs_features ?? []
                        setFormData({
                          ...formData,
                          ai_labs_features: e.target.checked
                            ? [...current, slug]
                            : current.filter((s) => s !== slug),
                        })
                      }}
                      className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
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
      const res = await fetch(`/api/pricing?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch packages')
      const data = await res.json()
      data.sort((a: PricingPackage, b: PricingPackage) => a.price_per_student - b.price_per_student)
      setPackages(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAiPricing = async () => {
    setLoadingAi(true)
    try {
      const res = await fetch(`/api/admin/ai-edit?t=${Date.now()}`)
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

  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleSave = async (pkg: Partial<PricingPackage>) => {
    const method = pkg.id ? 'PUT' : 'POST'
    console.log('[SAVE] method:', method, 'pkg:', JSON.stringify(pkg))
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/pricing', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg),
      })
      const responseText = await res.text()
      console.log('[SAVE] response status:', res.status, 'body:', responseText)
      if (!res.ok) {
        setSaveStatus('error: ' + responseText)
        alert('Save gagal: ' + responseText)
        return
      }
      setSaveStatus('success')
      setEditingPackage(null)
      await fetchPackages()
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err) {
      console.error('Save failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setSaveStatus('error: ' + msg)
      alert('Save gagal: ' + msg)
    }
  }

  const handleSaveAi = async (item: AiFeaturePricing) => {
    try {
      const res = await fetch('/api/admin/ai-edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          feature_slug: item.feature_slug,
          credits_per_use: item.credits_per_use,
          credits_per_unlock: item.credits_per_unlock,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditingAi(null)
      fetchAiPricing()
    } catch (err) {
      console.error('Save AI pricing failed:', err)
      alert('Save gagal: ' + (err instanceof Error ? err.message : String(err)))
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
      {saveStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          saveStatus === 'saving' ? 'bg-yellow-500/20 text-yellow-300' :
          saveStatus === 'success' ? 'bg-green-500/20 text-green-300' :
          'bg-red-500/20 text-red-300'
        }`}>
          {saveStatus === 'saving' ? '⏳ Menyimpan...' :
           saveStatus === 'success' ? '✅ Berhasil disimpan!' :
           `❌ ${saveStatus}`}
        </div>
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
                {/* Generate pricing — hide for flipbook_unlock which is unlock-only */}
                {editingAi.feature_slug !== 'flipbook_unlock' && (
                  <label className="block">
                    <span className="text-sm text-gray-300 mb-1 block">Credit per Generate</span>
                    <p className="text-xs text-gray-500 mb-1">Biaya setiap kali user melakukan generate AI.</p>
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
                      className="w-full p-2 bg-gray-700 rounded"
                      required
                    />
                  </label>
                )}
                {/* Unlock pricing */}
                <label className="block">
                  <span className="text-sm text-gray-300 mb-1 block">Credit per Unlock (per Album)</span>
                  <p className="text-xs text-gray-500 mb-1">Biaya satu kali untuk membuka fitur ini di album tertentu.</p>
                  <input
                    name="credits_per_unlock"
                    type="number"
                    min={0}
                    value={editingAi.credits_per_unlock}
                    onChange={(e) =>
                      setEditingAi({
                        ...editingAi,
                        credits_per_unlock: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 bg-gray-700 rounded"
                    required
                  />
                </label>
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
          subtitle="Kelola paket harga yearbook & AI Labs pricing."
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
          Unlock &amp; Generate
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-app">{pkg.name}</h3>
                    {pkg.is_popular && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                        <Star size={10} /> Popular
                      </span>
                    )}
                  </div>
                  <p className="text-muted">
                    Rp {pkg.price_per_student.toLocaleString('id-ID')} / student (min. {pkg.min_students})
                  </p>
                  {pkg.flipbook_enabled && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 text-xs font-medium">
                      <Book size={12} /> Flipbook
                    </span>
                  )}
                  {(pkg.ai_labs_features ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(pkg.ai_labs_features ?? []).map((slug) => (
                        <span key={slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                          <Sparkles size={10} /> {AI_FEATURE_LABELS[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  )}
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
      ) : aiPricing.length === 0 ? (
        <div className="bg-white/[0.03] p-4 rounded-lg border border-white/10 text-center">
          <p className="text-muted text-sm">Belum ada data pricing. Jalankan migration SQL terlebih dahulu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Kelola biaya <strong>unlock</strong> (buka fitur per album) dan <strong>generate</strong> (per pemakaian AI) dalam credit.</p>
          {aiPricing.map((item) => {
            const isFlipbook = item.feature_slug === 'flipbook_unlock'
            const hasGenerate = GENERATE_SLUGS.has(item.feature_slug)
            return (
              <div
                key={item.id}
                className="bg-white/[0.03] p-4 rounded-lg flex justify-between items-center border border-white/10"
              >
                <div>
                  <h3 className="font-bold text-lg text-app">
                    {AI_FEATURE_LABELS[item.feature_slug] ?? item.feature_slug}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-muted text-sm">
                      🔓 Unlock: <span className="text-purple-400 font-semibold">{item.credits_per_unlock}</span> credit
                    </span>
                    {hasGenerate && !isFlipbook && (
                      <span className="text-muted text-sm">
                        ⚡ Generate: <span className="text-sky-400 font-semibold">{item.credits_per_use}</span> credit
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingAi(item)}
                  className="p-2 text-yellow-400 hover:text-yellow-300"
                >
                  <Edit size={20} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
