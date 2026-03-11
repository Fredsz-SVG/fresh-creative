'use client'

import { useEffect, useState } from 'react'
import { Upload, X, Loader2, Download, User, Shirt, ChevronUp, ChevronDown, Save } from 'lucide-react'
import { Client } from '@gradio/client'
import { downloadImageWithWatermark } from '@/lib/download-image'
import { fetchWithAuth } from '../../lib/api-client'


const API_URL = 'https://virtual-try-on.fmind.dev/'
const ENDPOINT = '/generate_try_on_images'
const MAX_PRODUCTS = 3

interface ProductItem {
  file: File
  preview: string
  id: number
}

export default function TryOn() {
  const [personImage, setPersonImage] = useState<File | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [personPreview, setPersonPreview] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [creditsPerGenerate, setCreditsPerGenerate] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/ai-edit')
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        const item = data.find((p: any) => p.feature_slug === 'tryon')
        if (!item) return
        if (cancelled) return
        if (typeof item.credits_per_use === 'number') {
          setCreditsPerGenerate(item.credits_per_use)
        }
      } catch {
        // ignore
      }
    }
    loadPricing()
    return () => {
      cancelled = true
    }
  }, [])

  const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPersonImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setPersonPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const toAdd = Math.min(MAX_PRODUCTS - products.length, files.length)
    if (toAdd <= 0) {
      setError(`Maksimal ${MAX_PRODUCTS} foto produk.`)
      e.target.value = ''
      return
    }
    setError(null)
    const filesToAdd = Array.from(files).slice(0, toAdd)
    const newItems: ProductItem[] = await Promise.all(
      filesToAdd.map(
        (file) =>
          new Promise<ProductItem>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () =>
              resolve({ file, preview: reader.result as string, id: Date.now() + Math.random() })
            reader.readAsDataURL(file)
          })
      )
    )
    setProducts((prev) => [...prev, ...newItems].slice(0, MAX_PRODUCTS))
    e.target.value = ''
  }

  const removeProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const next = index + (direction === 'up' ? -1 : 1)
    if (next < 0 || next >= products.length) return
    setProducts((prev) => {
      const arr = [...prev]
        ;[arr[index], arr[next]] = [arr[next], arr[index]]
      return arr
    })
  }

  const baseUrl = API_URL.replace(/\/$/, '')

  const normalizeResultToUrls = (data: unknown): string[] => {
    if (data === undefined || data === null) return []
    const collected: string[] = []
    const toUrl = (item: unknown): string | null => {
      if (typeof item === 'string') {
        if (item.startsWith('http') || item.startsWith('data:')) return item
        if (item.trim().length > 0 && (item.includes('/') || item.includes('.'))) return `${baseUrl}${item.startsWith('/') ? '' : '/'}${item}`
        return null
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        if (typeof o.url === 'string' && (o.url.startsWith('http') || o.url.startsWith('data:'))) return o.url
        if (typeof o.path === 'string') {
          return o.path.startsWith('http') || o.path.startsWith('data:') ? o.path : `${baseUrl}${o.path.startsWith('/') ? '' : '/'}${o.path}`
        }
        if (Array.isArray(o.path) && o.path.length > 0) {
          const first = o.path[0]
          if (typeof first === 'string')
            return first.startsWith('http') || first.startsWith('data:') ? first : `${baseUrl}${first.startsWith('/') ? '' : '/'}${first}`
        }
        if (o.blob instanceof Blob) return URL.createObjectURL(o.blob)
        if (item instanceof Blob) return URL.createObjectURL(item)
      }
      return null
    }
    const collectFrom = (val: unknown): void => {
      if (typeof val === 'string') {
        const u = toUrl(val)
        if (u) collected.push(u)
        return
      }
      if (val && typeof val === 'object' && Array.isArray(val)) {
        val.forEach(collectFrom)
        return
      }
      if (val && typeof val === 'object') {
        const u = toUrl(val)
        if (u) collected.push(u)
        else Object.values(val as Record<string, unknown>).forEach(collectFrom)
      }
    }
    if (Array.isArray(data)) {
      for (const item of data) {
        const u = toUrl(item)
        if (u) collected.push(u)
        else collectFrom(item)
      }
      if (collected.length > 0) return [...new Set(collected)]
      const first = data[0]
      if (first && typeof first === 'object' && Array.isArray((first as Record<string, unknown>).path)) {
        const inner = (first as { path: unknown[] }).path
        return inner.map((i) => toUrl(i)).filter((u): u is string => !!u)
      }
    } else {
      const single = toUrl(data)
      if (single) return [single]
      collectFrom(data)
    }
    return collected.length > 0 ? [...new Set(collected)] : []
  }

  const getFirstImageBlob = async (rawData: unknown): Promise<Blob | null> => {
    if (!rawData) return null
    const arr = Array.isArray(rawData) && rawData.length === 1 && Array.isArray(rawData[0]) ? rawData[0] : Array.isArray(rawData) ? rawData : [rawData]
    for (const item of arr) {
      if (item && typeof item === 'object' && 'blob' in item && (item as { blob: unknown }).blob instanceof Blob) return (item as { blob: Blob }).blob
      if (item instanceof Blob) return item
    }
    const urls = normalizeResultToUrls(rawData)
    const firstUrl = urls[0]
    if (!firstUrl) return null
    if (firstUrl.startsWith('blob:')) {
      try {
        const res = await fetch(firstUrl)
        return await res.blob()
      } catch {
        return null
      }
    }
    try {
      const res = await fetch(firstUrl, { mode: 'cors' })
      return res.ok ? await res.blob() : null
    } catch {
      return null
    }
  }

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!personImage || products.length === 0) {
      setError('Upload foto orang dan minimal 1 foto produk (baju) terlebih dahulu.')
      return
    }

    setLoading(true)
    setResults([])
    setError(null)
    setLoadingProgress({ current: 0, total: products.length })

    try {
      const creditRes = await fetchWithAuth('/api/admin/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_slug: 'tryon' }),
      })
      const creditData = await creditRes.json().catch(() => ({}))
      if (!creditRes.ok || !creditData.ok) {
        if (creditRes.status === 402) {
          setError(
            creditData.error ||
            'Credit kamu tidak cukup untuk fitur Try On. Silakan top up credit terlebih dahulu.'
          )
        } else {
          setError(creditData.error || 'Gagal memotong credit untuk fitur Try On.')
        }
        setLoading(false)
        setLoadingProgress({ current: 0, total: 0 })
        return
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-updated'))
      }

      const client = await Client.connect(API_URL)
      let currentPerson: File | Blob = personImage
      for (let i = 0; i < products.length; i++) {
        setLoadingProgress({ current: i + 1, total: products.length })
        const result = await client.predict(ENDPOINT, {
          person_image: currentPerson,
          product_image: products[i].file,
          base_steps: 32,
          image_count: 1,
        })
        let rawData = result?.data
        if (Array.isArray(rawData) && rawData.length === 1 && Array.isArray(rawData[0])) {
          rawData = rawData[0]
        }
        const nextBlob = await getFirstImageBlob(rawData)
        if (!nextBlob) {
          setError(`Gagal mendapatkan hasil untuk baju ${i + 1}. Coba gambar lain atau ubah pengaturan.`)
          setLoading(false)
          setLoadingProgress({ current: 0, total: 0 })
          return
        }
        currentPerson = nextBlob
      }
      setResults([URL.createObjectURL(currentPerson)])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setLoadingProgress({ current: 0, total: 0 })
    }
  }

  return (
    <section id="tryon-gradio" className="py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleGenerate}>
          <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 text-center uppercase tracking-widest">
              Upload foto orang dan 1–3 item, lalu generate.
            </p>
            {/* Person Image */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Foto Orang (Person Image) <span className="text-red-500">*</span>
              </label>
              {!personPreview ? (
                <div
                  onClick={() => document.getElementById('person-upload')?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-900 transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                  <p className="text-[10px] sm:text-sm text-slate-600 uppercase tracking-widest">
                    Klik untuk upload foto orang
                  </p>
                  <input
                    id="person-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePersonUpload}
                    required
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-slate-100 rounded-xl border-2 border-slate-900 flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#0f172a]">
                    <img
                      src={personPreview}
                      alt="Person preview"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPersonImage(null)
                        setPersonPreview(null)
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 sm:p-2 bg-red-500 text-white rounded-full border-2 border-slate-900 hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product Images (max 3) */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Foto Produk / Item (maks. {MAX_PRODUCTS}) <span className="text-red-500">*</span>
              </label>
              <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">
                Urutan berpengaruh — pastikan dari outfit atas ke bawah.
              </p>
              <div
                onClick={() => products.length < MAX_PRODUCTS && document.getElementById('product-upload')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center transition-colors ${products.length < MAX_PRODUCTS
                  ? 'border-slate-300 cursor-pointer hover:border-slate-900'
                  : 'border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
              >
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                <p className="text-[10px] sm:text-sm text-slate-600 uppercase tracking-widest">
                  {products.length < MAX_PRODUCTS
                    ? `Klik untuk upload foto baju (${products.length}/${MAX_PRODUCTS})`
                    : `Sudah ${MAX_PRODUCTS} foto. Hapus salah satu untuk menambah.`}
                </p>
                <input
                  id="product-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProductUpload}
                  className="hidden"
                />
              </div>
              {products.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {products.map((p, index) => (
                    <div
                      key={p.id}
                      className="relative bg-slate-100 rounded-xl border-2 border-slate-900 overflow-hidden shadow-[2px_2px_0_0_#0f172a]"
                    >
                      <img
                        src={p.preview}
                        alt="Product"
                        className="w-full h-32 sm:h-36 object-contain"
                      />
                      <span className="block text-center text-[10px] font-black text-slate-600 py-1 uppercase tracking-widest">
                        Urutan {index + 1} (dipakai {index + 1 === 1 ? 'pertama' : index + 1 === 2 ? 'kedua' : 'terakhir'})
                      </span>
                      <div className="absolute top-1 right-1 flex gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => moveProduct(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 bg-slate-900 text-white rounded-full border-2 border-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Pindah ke atas"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProduct(index, 'down')}
                          disabled={index === products.length - 1}
                          className="p-1.5 bg-slate-900 text-white rounded-full border-2 border-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Pindah ke bawah"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProduct(p.id)}
                          className="p-1.5 bg-red-500 text-white rounded-full border-2 border-slate-900 hover:bg-red-600"
                          title="Hapus"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === 'number' && creditsPerGenerate >= 0 && (
              <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-widest">
                Biaya: {creditsPerGenerate} credit per generate Try On.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !personImage || products.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>
                    Memproses {loadingProgress.total > 0 ? `${loadingProgress.current}/${loadingProgress.total}` : ''}...
                  </span>
                </>
              ) : (
                <>
                  <Shirt className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Generate Try-On {products.length > 0 ? `(${products.length} baju)` : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 text-center uppercase tracking-tight">
              Hasil Virtual Try-On (1 foto)
            </h3>
            <div className="grid gap-4 grid-cols-1 max-w-md mx-auto">
              {results.map((url, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-3 sm:p-4"
                >
                  <div className="relative">
                    <img
                      src={url}
                      alt={`Try-on result ${index + 1}`}
                      className="w-full h-auto max-h-64 sm:max-h-80 object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setDownloadingIndex(index)
                        try {
                          await downloadImageWithWatermark(
                            url,
                            `fresh-creative-tryon-api-${Date.now()}-${index + 1}.jpg`
                          )
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Download gagal')
                        } finally {
                          setDownloadingIndex(null)
                        }
                      }}
                      disabled={downloadingIndex === index}
                      className="absolute top-1.5 right-1.5 p-1.5 sm:p-2 bg-emerald-500 text-white rounded-full border-2 border-slate-900 hover:bg-emerald-600 transition-colors disabled:opacity-70 shadow-[2px_2px_0_0_#0f172a]"
                      title="Download"
                    >
                      {downloadingIndex === index ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
