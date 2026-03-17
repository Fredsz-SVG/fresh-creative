'use client'

import { useEffect, useState } from 'react'
import { Edit, Plus, Save, Trash2, X, Book, Sparkles, Star, ChevronRight, Layout, Zap, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '../../../lib/api-client'

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
  image_remove_bg: 'Image Editor',
  flipbook_unlock: 'Flipbook',
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

  const [addons, setAddons] = useState<{ name: string, price: number }[]>(() => {
    return (formData.features || []).map(f => {
      try {
        const parsed = JSON.parse(f);
        if (parsed.name) return { name: parsed.name, price: Number(parsed.price) || 0 };
      } catch (e) { }
      return { name: f, price: 0 };
    })
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'number') {
      setFormData({ ...formData, [name]: Number(value) })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddonNameChange = (index: number, name: string) => {
    const newAddons = [...addons];
    newAddons[index].name = name;
    setAddons(newAddons);
  }

  const handleAddonPriceChange = (index: number, price: number) => {
    const newAddons = [...addons];
    newAddons[index].price = price;
    setAddons(newAddons);
  }

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const features = addons.map(a => JSON.stringify(a));
    onSave({ ...formData, features })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center p-2 md:p-4 z-[100] backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] md:shadow-[12px_12px_0_0_#0f172a] dark:md:shadow-[12px_12px_0_0_#334155] p-5 md:p-8 w-full max-w-lg max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{pkg?.id ? 'Edit Package' : 'New Package'}</h2>
          <button onClick={onCancel} className="p-1 md:p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} className="md:w-6 md:h-6 text-slate-900 dark:text-white" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1 md:mb-1.5 block">Package Name</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Gold" className="w-full px-4 py-3 md:px-5 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] focus:shadow-none" required />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1 md:mb-1.5 block">Price / Student</label>
                <input name="price_per_student" type="number" value={formData.price_per_student} onChange={handleChange} placeholder="0" className="w-full px-4 py-3 md:px-5 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] focus:shadow-none" required />
              </div>
              <div>
                <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1 md:mb-1.5 block">Min. Student</label>
                <input name="min_students" type="number" value={formData.min_students} onChange={handleChange} placeholder="0" className="w-full px-4 py-3 md:px-5 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] focus:shadow-none" required />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 md:p-5 rounded-[20px] md:rounded-[24px] border-4 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155]">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <p className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Features</p>
                <button type="button" onClick={() => setAddons([...addons, { name: '', price: 0 }])} className="text-[10px] md:text-xs bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none font-black transition-all">
                  + Add
                </button>
              </div>
              <div className="space-y-2 md:space-y-3 max-h-40 md:max-h-60 overflow-y-auto pr-1">
                {addons.length === 0 && <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-300 font-bold italic py-2 md:py-4 text-center">Belum ada add-on.</p>}
                {addons.map((addon, idx) => (
                  <div key={idx} className="flex gap-1.5 md:gap-2 items-center">
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => handleAddonNameChange(idx, e.target.value)}
                      placeholder="Fitur"
                      className="flex-1 p-2 md:p-2.5 text-xs md:text-sm bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-lg md:rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                      required
                    />
                    <input
                      type="number"
                      value={addon.price || ''}
                      onChange={(e) => handleAddonPriceChange(idx, Number(e.target.value))}
                      placeholder="Rp"
                      className="w-16 md:w-24 p-2 md:p-2.5 text-xs md:text-sm bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-lg md:rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button type="button" onClick={() => removeAddon(idx)} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 md:p-2 rounded-lg transition-colors">
                      <Trash2 size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 md:p-4 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl bg-amber-50 dark:bg-slate-800 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155]">
              <label className="flex items-center gap-3 md:gap-4 cursor-pointer select-none">
                <div className="relative scale-90 md:scale-100">
                  <input
                    type="checkbox"
                    checked={!!formData.is_popular}
                    onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 dark:bg-slate-600 border-2 border-slate-900 dark:border-slate-700 rounded-full peer-checked:bg-amber-400 dark:peer-checked:bg-amber-500 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-slate-300 border-2 border-slate-900 dark:border-slate-700 rounded-full transition-transform peer-checked:translate-x-6" />
                </div>
                <span className="text-xs md:text-sm text-slate-900 dark:text-white font-black flex items-center gap-2">
                  <Star size={14} className="md:w-4 md:h-4 text-amber-500 fill-amber-500" />
                  Popular
                </span>
              </label>
            </div>

            <div className="space-y-2 md:space-y-3">
              <p className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Included AI Labs</p>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {Object.entries(AI_FEATURE_LABELS).map(([slug, label]) => (
                  <label key={slug} className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl border-4 border-slate-900 dark:border-slate-700 transition-all cursor-pointer select-none ${(formData.ai_labs_features ?? []).includes(slug) ? 'bg-indigo-100 dark:bg-indigo-900/50 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'bg-white dark:bg-slate-800 shadow-none'
                    }`}>
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
                      className="w-4 h-4 md:w-5 md:h-5 rounded-md border-2 border-slate-900 dark:border-slate-700 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white truncate">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 md:px-6 md:py-4 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] active:shadow-none text-xs md:text-base">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-3 md:px-6 md:py-4 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-none text-xs md:text-base">
              Save
            </button>
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
      const res = await fetchWithAuth(`/api/pricing?t=${Date.now()}`, { cache: 'no-store' })
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
      const res = await fetchWithAuth(`/api/admin/ai-edit?t=${Date.now()}`)
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
      const res = await fetchWithAuth('/api/pricing', {
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
      const res = await fetchWithAuth('/api/admin/ai-edit', {
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
      const res = await fetchWithAuth('/api/pricing', {
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
        <div className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] max-w-[90%] md:max-w-md w-full px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl border-4 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[8px_8px_0_0_#0f172a] dark:md:shadow-[8px_8px_0_0_#334155] transform transition-all animate-bounce-subtle ${saveStatus === 'saving' ? 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white' :
          saveStatus === 'success' ? 'bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white' :
            'bg-red-400 dark:bg-red-600 text-white'
          }`}>
          <div className="flex items-center gap-2 md:gap-3 font-black text-xs md:text-sm">
            {saveStatus === 'saving' ? <RefreshCw className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : null}
            {saveStatus === 'saving' ? 'Processing...' :
              saveStatus === 'success' ? 'Success!' :
                `Error: ${saveStatus}`}
          </div>
        </div>
      )}
      {editingAi && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] md:shadow-[12px_12px_0_0_#0f172a] dark:md:shadow-[12px_12px_0_0_#334155] p-6 md:p-8 w-full max-w-md">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 tracking-tight">
              Pricing: {AI_FEATURE_LABELS[editingAi.feature_slug] ?? editingAi.feature_slug}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveAi(editingAi)
              }}
              className="space-y-4 md:space-y-6"
            >
              <div className="space-y-3 md:space-y-4">
                {editingAi.feature_slug !== 'flipbook_unlock' && (
                  <div>
                    <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1 md:mb-1.5 block">Credit per Gen</label>
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
                      className="w-full px-4 py-3 md:px-5 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1 md:mb-1.5 block">Credit per Unlock</label>
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
                    className="w-full px-4 py-3 md:px-5 md:py-3.5 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] focus:shadow-none"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                <button
                  type="button"
                  onClick={() => setEditingAi(null)}
                  className="flex-1 px-4 py-3 md:px-6 md:py-4 border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl text-slate-900 dark:text-white font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] active:shadow-none text-xs md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 md:px-6 md:py-4 bg-sky-400 dark:bg-sky-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-xl md:rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-none text-xs md:text-base"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:justify-between lg:items-end px-4 md:px-0">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Pricing Config</h1>
          <p className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-300">Kelola paket harga yearbook & fitur berbayar lainnya.</p>
        </div>
        <button onClick={() => setEditingPackage({})} className="flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-lime-400 dark:bg-lime-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-none text-sm md:text-base">
          <Plus size={20} className="md:w-6 md:h-6" strokeWidth={3} />
          Create Package
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8 grid grid-cols-2 gap-2 md:flex md:flex-nowrap md:gap-3 px-4 md:px-0">
        <button
          type="button"
          onClick={() => setActiveTab('yearbook')}
          className={`flex items-center justify-center gap-2 md:gap-3 px-2 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-base font-black border-4 border-slate-900 dark:border-slate-700 transition-all active:scale-95 ${activeTab === 'yearbook' ? 'bg-violet-400 dark:bg-violet-600 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155]' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none'}`}
        >
          <Layout className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
          <span>Yearbook</span>
          <span className="px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[9px] md:text-xs rounded-lg border-2 border-slate-900 dark:border-slate-600 ml-0.5 md:ml-1">
            {packages.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center justify-center gap-2 md:gap-3 px-2 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-base font-black border-4 border-slate-900 dark:border-slate-700 transition-all active:scale-95 ${activeTab === 'ai' ? 'bg-sky-400 dark:bg-sky-600 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155]' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none'}`}
        >
          <Zap className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
          <span>Unlock & Gen</span>
          <span className="px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[9px] md:text-xs rounded-lg border-2 border-slate-900 dark:border-slate-600 ml-0.5 md:ml-1">
            {aiPricing.length}
          </span>
        </button>
      </div>

      {activeTab === 'yearbook' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-4 md:px-0">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-6 md:p-8 animate-pulse shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[8px_8px_0_0_#0f172a] dark:md:shadow-[8px_8px_0_0_#334155]"
              >
                <div className="space-y-4">
                  <div className="h-6 md:h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-32 md:w-48" />
                  <div className="h-4 md:h-6 bg-slate-50 dark:bg-slate-800 rounded-lg w-full" />
                  <div className="h-20 md:h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-4 md:px-0 pb-12">
            {packages.map((pkg) => {
              const addonsList = pkg.features.map((f) => {
                try {
                  const j = JSON.parse(f);
                  return { name: j.name || f, price: Number(j.price) || 0 };
                } catch {
                  return { name: f, price: 0 };
                }
              });

              return (
                <div
                  key={pkg.id}
                  className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[8px_8px_0_0_#0f172a] dark:md:shadow-[8px_8px_0_0_#334155] hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#334155] md:hover:shadow-[12px_12px_0_0_#0f172a] dark:md:hover:shadow-[12px_12px_0_0_#334155] hover:-translate-x-1 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 pt-4 pr-4 md:pt-6 md:pr-6 flex gap-1.5 md:gap-2 scale-90 md:scale-100">
                    <button
                      onClick={() => setEditingPackage(pkg)}
                      className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-amber-300 dark:bg-amber-600 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all active:scale-95"
                    >
                      <Edit size={16} className="md:w-5 md:h-5" strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-red-400 dark:bg-red-600 border-2 border-slate-900 dark:border-slate-700 text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all active:scale-95"
                    >
                      <Trash2 size={16} className="md:w-5 md:h-5" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="mb-4 md:mb-6">
                    <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2 pr-20 md:pr-0">
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{pkg.name}</h3>
                      {pkg.is_popular && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1 rounded-full bg-amber-400 dark:bg-amber-600 text-slate-900 dark:text-white text-[10px] md:text-xs font-black border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                          <Star size={10} className="md:w-3 md:h-3" fill="currentColor" /> Pop
                        </span>
                      )}
                    </div>
                    <div className="text-slate-900 dark:text-white font-black">
                      <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Harga dasar</span>
                      <div className="mt-0.5">
                        <span className="text-2xl md:text-3xl">Rp {pkg.price_per_student.toLocaleString('id-ID')}</span>
                        <span className="text-slate-400 dark:text-slate-300 text-xs md:text-sm ml-1 md:ml-2">/ student</span>
                      </div>
                    </div>
                    <p className="text-slate-400 dark:text-slate-300 font-bold text-[10px] md:text-sm mt-0.5 md:mt-1">Min. {pkg.min_students} Siswa</p>
                  </div>

                  {(pkg.ai_labs_features ?? []).length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {(pkg.ai_labs_features ?? []).map((slug) => (
                        <span
                          key={slug}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] ${slug === 'flipbook_unlock' ? 'bg-emerald-300 dark:bg-emerald-700 text-slate-900 dark:text-white' : 'bg-indigo-300 dark:bg-indigo-700 text-slate-900 dark:text-white'
                            }`}
                        >
                          {slug === 'flipbook_unlock' ? <Book size={12} strokeWidth={3} /> : <Sparkles size={12} strokeWidth={3} />}
                          {AI_FEATURE_LABELS[slug]?.toUpperCase() ?? slug.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-2xl p-5 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-3">Add-on extra (opsional — bisa dipilih user)</p>
                    <ul className="space-y-3">
                      {addonsList.length === 0 ? (
                        <li className="text-sm font-bold text-slate-400 dark:text-slate-400 italic">Belum ada add-on.</li>
                      ) : (
                        addonsList.map((addon, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
                              <ChevronRight size={14} className="text-indigo-400 dark:text-indigo-300" strokeWidth={4} />
                              {addon.name}
                            </div>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-300">
                              {addon.price > 0 ? `+Rp ${addon.price.toLocaleString('id-ID')} / siswa` : '—'}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : loadingAi ? (
        <div className="space-y-6 px-4 md:px-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-3xl p-6 md:p-8 animate-pulse shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155]"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-3">
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-40" />
                  <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-lg w-64" />
                </div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : aiPricing.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] p-12 text-center shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155] mx-4 md:mx-0">
          <Zap className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-600" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No AI Data</h3>
          <p className="text-slate-400 dark:text-slate-300 font-bold">Jalankan migration SQL terlebih dahulu untuk mengisi data pricing AI.</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6 px-4 md:px-0 pb-12">
          <p className="px-3 py-2 md:px-4 md:py-3 bg-indigo-50 dark:bg-indigo-900/30 border-4 border-indigo-200 dark:border-indigo-800 rounded-xl md:rounded-2xl text-[11px] md:text-[13px] font-black text-indigo-700 dark:text-indigo-200 w-fit mb-2 md:mb-4">
            Kelola biaya <span className="underline decoration-wavy underline-offset-4">unlock</span> & <span className="underline decoration-wavy underline-offset-4">generate</span>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {aiPricing.map((item) => {
              const isFlipbook = item.feature_slug === 'flipbook_unlock'
              const hasGenerate = GENERATE_SLUGS.has(item.feature_slug)
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[24px] md:rounded-3xl p-5 md:p-8 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] md:shadow-[6px_6px_0_0_#0f172a] dark:md:shadow-[6px_6px_0_0_#334155] hover:shadow-[6px_6px_0_0_#0f172a] dark:hover:shadow-[6px_6px_0_0_#334155] md:hover:shadow-[10px_10px_0_0_#0f172a] dark:md:hover:shadow-[10px_10px_0_0_#334155] hover:-translate-x-1 hover:-translate-y-1 transition-all group flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2 md:mb-3">
                      {AI_FEATURE_LABELS[item.feature_slug] ?? item.feature_slug}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1.5 md:gap-y-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Unlock</span>
                        <span className="text-base md:text-lg font-black text-violet-500 dark:text-violet-400">{item.credits_per_unlock} <span className="text-[10px] text-slate-400 dark:text-slate-300">CREDITS</span></span>
                      </div>
                      {hasGenerate && !isFlipbook && (
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Generate</span>
                          <span className="text-base md:text-lg font-black text-sky-500 dark:text-sky-400">{item.credits_per_use} <span className="text-[10px] text-slate-400 dark:text-slate-300">CREDITS</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingAi(item)}
                    className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-amber-400 dark:bg-amber-600 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white hover:translate-x-0.5 hover:translate-y-0.5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none transition-all active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Edit size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
