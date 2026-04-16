'use client'

import { useEffect, useState } from 'react'
import { Upload, X, Loader2, Download, User, Shirt, ChevronUp, ChevronDown, Sparkles } from 'lucide-react'
import { downloadImageWithWatermark } from '@/lib/download-image'
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'


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
  const [error, setError] = useState<string | null>(null)
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null)
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
              resolve({
                file,
                preview: reader.result as string,
                id: Date.now() + Math.random(),
              })
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

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!personImage || products.length === 0) {
      setError('Upload foto orang dan minimal 1 foto produk (baju) terlebih dahulu.')
      return
    }

    setLoading(true)
    setResults([])
    setError(null)

    try {
      // Backend: POST /api/ai-features/tryon — Gemini (deskripsi + gambar), mode chain = satu request, berurutan di server.
      const formData = new FormData()
      formData.append('human_img', personImage)
      formData.append('mode', 'chain')
      for (let i = 0; i < products.length; i++) {
        formData.append('garments', products[i].file)
      }

      const res = await fetchWithAuth('/api/ai-features/tryon', {
        method: 'POST',
        body: formData,
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok || data.ok !== true) {
        if (res.status === 402) {
          setError(asString(data.error) || 'Credit kamu tidak cukup untuk fitur Try On. Silakan top up credit terlebih dahulu.')
        } else {
          setError(asString(data.error) || 'Gagal memproses Try On.')
        }
        setLoading(false)
        return
      }
      const r = (data as Record<string, unknown>).results
      const urls =
        Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string') : typeof r === 'string' ? [r] : []
      if (!urls.length) {
        setError('Gagal mendapatkan hasil akhir. Coba lagi.')
        setLoading(false)
        return
      }
      setResults(urls)
      setError(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-updated'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="tryon" className="py-4 md:py-6" aria-label="Virtual try-on">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleGenerate}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                Virtual Try-On AI
              </p>
              <p className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest max-w-md">
                Upload foto kamu dan 1–3 item pakaian; lihat keajaiban AI kami memakaikan pakaian favoritmu dengan gaya yang ultra-realistis!
              </p>
            </div>
            {/* Person Image */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Foto Orang (Person Image) <span className="text-red-500">*</span>
              </label>
              {!personPreview ? (
                <div
                  onClick={() => document.getElementById('person-upload')?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-200 dark:hover:border-slate-400 transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                  <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 uppercase tracking-widest">
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
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
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
                      className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-red-600 transition-colors shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product Images (max 3) */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Foto Produk / Item (maks. {MAX_PRODUCTS}) <span className="text-red-500">*</span>
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Urutan kadang berpengaruh. Disarankan upload dari pakaian atas ke bawah.
              </p>
              <div
                onClick={() => products.length < MAX_PRODUCTS && document.getElementById('product-upload')?.click()}
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center transition-colors ${products.length < MAX_PRODUCTS
                  ? 'border-slate-300 dark:border-slate-600 cursor-pointer hover:border-slate-200 dark:hover:border-slate-400'
                  : 'border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                  }`}
              >
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 uppercase tracking-widest">
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
                      className="relative bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-600 overflow-hidden shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                    >
                      <img
                        src={p.preview}
                        alt="Product"
                        className="w-full h-32 sm:h-36 object-contain"
                      />
                      <span className="block text-center text-[10px] font-black text-slate-600 dark:text-slate-300 py-1 uppercase tracking-widest">
                        Urutan {index + 1} (dipakai {index + 1 === 1 ? 'pertama' : index + 1 === 2 ? 'kedua' : 'terakhir'})
                      </span>
                      <div className="absolute top-1 right-1 flex gap-1 z-10">
                        <button
                          type="button"
                          onClick={() => moveProduct(index, 'up')}
                          disabled={index === 0}
                          className="inline-flex items-center justify-center w-8 h-8 bg-slate-900 text-white rounded-full border-2 border-slate-200 hover:bg-slate-800 shadow-[4px_4px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Pindah ke atas"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProduct(index, 'down')}
                          disabled={index === products.length - 1}
                          className="inline-flex items-center justify-center w-8 h-8 bg-slate-900 text-white rounded-full border-2 border-slate-200 hover:bg-slate-800 shadow-[4px_4px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Pindah ke bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProduct(p.id)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-full border-2 border-slate-200 hover:bg-red-600 shadow-[4px_4px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                          title="Hapus"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-400 rounded-xl text-red-600 dark:text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === 'number' && creditsPerGenerate >= 0 && (
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
                Biaya:{' '}
                {products.length > 0
                  ? `${creditsPerGenerate * products.length} credit (${products.length} item × ${creditsPerGenerate})`
                  : `${creditsPerGenerate} credit per item`}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !personImage || products.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-200 dark:border-slate-600 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Sedang meracik gaya barumu…</span>
                </>
              ) : (
                <>
                  <Shirt className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    Generate {products.length > 0 ? `(${products.length} item pakaian)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 dark:text-white text-center uppercase tracking-tight">
              Hasil Virtual Try-On
              {results.length > 1 ? ` (${results.length} gambar)` : ''}
            </h3>
            <div className="grid gap-4 grid-cols-1 max-w-md mx-auto">
              {results.map((url, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] p-3 sm:p-4"
                >
                  <div className="relative">
                    <img
                      src={url}
                      alt={`Try-on result ${index + 1}`}
                      className="w-full h-auto object-contain rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setDownloadingIndex(index)
                        try {
                          await downloadImageWithWatermark(
                            url,
                            `fresh-creative-tryon-${Date.now()}-${index + 1}.jpg`
                          )
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Download gagal')
                        } finally {
                          setDownloadingIndex(null)
                        }
                      }}
                      disabled={downloadingIndex === index}
                      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-emerald-600 transition-colors shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-70"
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
