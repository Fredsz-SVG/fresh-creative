'use client';
import { useEffect, useState } from 'react';
import { Upload, X, Loader2, Download, User } from 'lucide-react';
import { downloadImageWithWatermark } from '@/lib/download-image';
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

export default function Pose() {
  const [subject, setSubject] = useState<File | null>(null);
  const [subjectPreview, setSubjectPreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [creditsPerGenerate, setCreditsPerGenerate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/ai-edit');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const item = data.find((p: any) => p.feature_slug === 'pose');
        if (!item || cancelled) return;
        if (typeof item.credits_per_use === 'number') {
          setCreditsPerGenerate(item.credits_per_use);
        }
      } catch {
        // ignore
      }
    };
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubject(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubjectPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate: subject (foto karakter) is required
    if (!subject) {
      setError("Silakan upload foto karakter (subject) terlebih dahulu!");
      return;
    }

    // Prompt is optional - backend will use default "A headshot photo" if empty

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("prompt", prompt);

      const res = await fetchWithAuth("/api/ai-features/pose", {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text()
      const data = asObject((() => { try { return rawText ? JSON.parse(rawText) : {} } catch { return {} } })())

      if (data.ok && data.results) {
        // Ensure results is an array
        const rawResults = data.results
        const resultsArray = Array.isArray(rawResults)
          ? rawResults.filter((item): item is string => typeof item === 'string')
          : (typeof rawResults === 'string' ? [rawResults] : [])
        setResults(resultsArray);
      } else {
        // Handle error status codes
        const fallback = rawText || `HTTP ${res.status} ${res.statusText}` || "Gagal mengubah pose"
        const msg = asString(data.error) || fallback
        if (res.status === 402) {
          setError(msg || "❌ Credit Replicate tidak cukup!");
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
    <section id="pose" className="py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleGeneratePose}>
          <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 text-center uppercase tracking-widest">
              Upload foto karakter dan deskripsikan pose yang diinginkan.
            </p>
            {/* Subject Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>1. Upload Foto Karakter (Subject) <span className="text-red-500">*</span></span>
              </label>
              <p className="text-[10px] text-slate-500 mb-2 sm:mb-3 uppercase tracking-widest">
                Upload foto closeup headshot seseorang. Foto square closeup wajah memberikan hasil terbaik.
              </p>
              <div
                onClick={() => document.getElementById("subject-upload")?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-900 transition-colors"
              >
                {subjectPreview ? (
                  <User className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-emerald-500" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-slate-400" />
                )}
                <p className="text-[10px] sm:text-sm text-slate-600 uppercase tracking-widest">
                  {subjectPreview ? "Foto karakter sudah diupload" : "Klik untuk upload foto karakter"}
                </p>
                <input
                  id="subject-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSubjectUpload}
                  className="hidden"
                  required
                />
              </div>

              {/* Subject Preview */}
              {subjectPreview && (
                <div className="mt-3 sm:mt-4">
                  <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto h-48 sm:h-56 md:h-64 bg-slate-100 rounded-xl border-2 border-slate-900 flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#0f172a]">
                    <img
                      src={subjectPreview}
                      alt="Subject preview"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSubject(null);
                        setSubjectPreview(null);
                      }}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10 inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 text-white rounded-full border-2 border-slate-900 hover:bg-red-600 transition-colors shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                2. Instruksi Pose (Prompt)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: 'angkat tangan kanan seperti melambaikan', 'pose berdiri tegap tangan di pinggang', 'pose duduk santai menyamping'"
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 border-2 border-slate-900 rounded-xl bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-slate-900 resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-pre-line">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === 'number' && creditsPerGenerate >= 0 && (
              <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-widest">
                Biaya: {creditsPerGenerate} credit per generate Pose.
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !subject}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="text-xs sm:text-sm md:text-base">Memproses...</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm md:text-base">Generate Pose</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 text-center uppercase tracking-tight">
              Hasil Pose Transfer ({results.length} gambar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-3 sm:p-4"
                >
                  <div className="relative">
                    <img
                      src={result}
                      alt={`Pose result ${index + 1}`}
                      className="w-full h-auto max-h-64 sm:max-h-80 object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setDownloadingIndex(index);
                        try {
                          await downloadImageWithWatermark(
                            result,
                            `fresh-creative-pose-${index + 1}-${Date.now()}.png`
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Download gagal");
                        } finally {
                          setDownloadingIndex(null);
                        }
                      }}
                      disabled={downloadingIndex !== null}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-white rounded-full border-2 border-slate-900 hover:bg-emerald-600 transition-colors shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-70"
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
