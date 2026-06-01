'use client';
import { useState } from 'react';
import { Upload, X, Loader2, Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { downloadImageWithWatermark } from '@/lib/download-image';
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

export function BeforeAfterSlider({ beforeImage, afterImage }: { beforeImage: string; afterImage: string }) {
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="relative w-full h-auto overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 select-none">
      <img src={afterImage} className="w-full h-auto block object-contain" alt="After" draggable={false} />
      
      <img 
        src={beforeImage} 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }} 
        alt="After" 
        draggable={false}
      />
      
      <div className="absolute inset-0 z-10 w-full h-full group">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={sliderPosition} 
          onChange={(e) => setSliderPosition(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 p-0"
        />
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10 shadow-[0_0_5px_rgba(0,0,0,0.5)] flex items-center justify-center transition-colors group-hover:bg-amber-300"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
           <div className="w-8 h-8 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="-ml-0.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-180 -ml-2"><polyline points="15 18 9 12 15 6"></polyline></svg>
           </div>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] font-black rounded backdrop-blur-sm tracking-widest pointer-events-none z-10">BEFORE</div>
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-indigo-500/80 text-white text-[10px] font-black rounded backdrop-blur-sm tracking-widest pointer-events-none z-10">AFTER</div>
    </div>
  );
}

const resizeImageIfNeeded = async (file: File, maxPixels: number = 2000000): Promise<File> => {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.width;
      const height = img.height;
      const pixels = width * height;
      
      if (pixels <= maxPixels) {
        resolve(file);
        return;
      }
      
      const ratio = Math.sqrt(maxPixels / pixels);
      const newWidth = Math.floor(width * ratio);
      const newHeight = Math.floor(height * ratio);
      
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const resizedFile = new File([blob], file.name, {
          type: file.type || 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(resizedFile);
      }, file.type || 'image/jpeg', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
};

export default function Enhance({ creditCost }: { creditCost?: number }) {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const creditsPerGenerate = creditCost ?? 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!image) {
      setError("Silakan upload foto terlebih dahulu!");
      return;
    }

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      const imageToUpload = await resizeImageIfNeeded(image);
      const formData = new FormData();
      formData.append("image", imageToUpload);

      const res = await fetchWithAuth("/api/ai-features/enhance", {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text()
      const data = asObject((() => { try { return rawText ? JSON.parse(rawText) : {} } catch { return {} } })())

      if (data.ok && data.results) {
        const rawResults = data.results
        const resultsArray = Array.isArray(rawResults)
          ? rawResults.filter((item): item is string => typeof item === 'string')
          : (typeof rawResults === 'string' ? [rawResults] : [])
        setResults(resultsArray);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits-updated'))
        }
      } else {
        const fallback = rawText || `HTTP ${res.status} ${res.statusText}` || "Gagal mempertajam foto"
        const msg = asString(data.error) || fallback
        if (res.status === 402) {
          setError(msg || "❌ Credit tidak cukup!");
        } else {
          setError(`HTTP ${res.status} ${res.statusText}\n${msg}`)
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="enhance" className="py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleEnhance}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
              Upload foto blur yang ingin dipertajam / di-enhance.
            </p>
            
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>1. Upload Foto <span className="text-red-500">*</span></span>
              </label>
              
              <div
                onClick={() => document.getElementById("image-upload")?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-200 dark:hover:border-slate-400 transition-colors"
              >
                {imagePreview ? (
                  <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-emerald-500" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-slate-400" />
                )}
                <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  {imagePreview ? "Foto sudah diupload" : "Klik untuk upload foto"}
                </p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  required
                />
              </div>

              {imagePreview && (
                <div className="mt-3 sm:mt-4">
                  <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto h-48 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b]">
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10 inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-red-600 transition-colors shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-400 rounded-xl text-red-600 dark:text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-pre-line">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === 'number' && creditsPerGenerate >= 0 && (
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
                Biaya: {creditsPerGenerate} credit per generate.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !image}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-200 dark:border-slate-600 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="text-xs sm:text-sm md:text-base">Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm md:text-base">Enhance Foto</span>
                </>
              )}
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 dark:text-white text-center uppercase tracking-tight">
              Hasil Enhance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] p-3 sm:p-4 w-full"
                >
                  <div className="relative">
                    {imagePreview ? (
                      <BeforeAfterSlider beforeImage={imagePreview} afterImage={result} />
                    ) : (
                      <img
                        src={result}
                        alt={`Enhance result ${index + 1}`}
                        className="w-full h-auto max-h-[500px] object-contain rounded-xl"
                      />
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setDownloadingIndex(index);
                        try {
                          await downloadImageWithWatermark(
                            result,
                            `fresh-creative-enhance-${index + 1}-${Date.now()}.png`
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Download gagal");
                        } finally {
                          setDownloadingIndex(null);
                        }
                      }}
                      disabled={downloadingIndex !== null}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-emerald-600 transition-colors shadow-[2px_2px_0_0_#334155] dark:shadow-[2px_2px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-70"
                      title="Download (langsung ke device)"
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
  );
}
