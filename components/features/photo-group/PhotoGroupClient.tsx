'use client';
import { useEffect, useState } from 'react';
import { Upload, X, Loader2, Download, Users } from 'lucide-react';
import { downloadImageWithWatermark } from '@/lib/download-image';
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

interface Subject {
  file: File;
  preview: string;
  id: number;
}

const MAX_SUBJECTS = 10;

export default function PhotoGroup() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [creditsPerGenerate, setCreditsPerGenerate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/ai-edit');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const item = data.find((p: any) => p.feature_slug === 'photogroup');
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
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalAfterAdd = subjects.length + newFiles.length;

    if (totalAfterAdd > MAX_SUBJECTS) {
      setError(`Maksimal ${MAX_SUBJECTS} karakter per grup. Anda sudah memiliki ${subjects.length} karakter.`);
      e.target.value = ""; // Reset input
      return;
    }

    setError(null);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubjects((prev) => [
          ...prev,
          {
            file: file,
            preview: reader.result as string,
            id: Date.now() + Math.random(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ""; // Reset input untuk allow upload same file again
  };

  const removeSubject = (id: number) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleGenerateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (subjects.length < 2) {
      setError("Minimal upload 2 gambar untuk digabung!");
      return;
    }

    if (subjects.length > MAX_SUBJECTS) {
      setError(`Maksimal ${MAX_SUBJECTS} gambar per grup.`);
      return;
    }

    if (!prompt || prompt.trim() === "") {
      setError("Prompt wajib diisi! Deskripsikan bagaimana gambar-gambar ini akan digabung.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      subjects.forEach((subject) => formData.append("subjects", subject.file));
      formData.append("prompt", prompt);

      const res = await fetchWithAuth("/api/ai-features/photogroup", {
        method: "POST",
        body: formData,
      });

      const data = asObject(await res.json().catch(() => ({})));

      if (data.ok && data.result) {
        const resultUrl = asString(data.result)
        if (resultUrl) setResult(resultUrl);
      } else {
        // Handle error status codes
        if (res.status === 402) {
          setError(asString(data.error) || "❌ Credit Replicate tidak cukup!");
        } else {
          setError(asString(data.error) || "Gagal membuat grup foto");
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="photogroup" className="py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleGenerateGroup}>
          <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 text-center uppercase tracking-widest">
              Upload 2–10 gambar untuk digabung menjadi satu foto grup.
            </p>
            {/* Subjects Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>1. Upload Foto Karakter (Maksimal {MAX_SUBJECTS}) <span className="text-red-500">*</span></span>
              </label>
              <p className="text-[10px] text-slate-500 mb-2 sm:mb-3 uppercase tracking-widest">
                Upload maksimal {MAX_SUBJECTS} gambar yang ingin digabung menjadi 1 foto grup.
              </p>
              <div
                onClick={() => document.getElementById("subjects-upload")?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-900 transition-colors"
              >
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-slate-400" />
                <p className="text-[10px] sm:text-sm text-slate-600 uppercase tracking-widest">
                  {subjects.length >= MAX_SUBJECTS
                    ? `Sudah upload ${MAX_SUBJECTS} gambar`
                    : `Klik untuk upload gambar (${subjects.length}/${MAX_SUBJECTS})`}
                </p>
                <input
                  id="subjects-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSubjectUpload}
                  multiple
                  disabled={subjects.length >= MAX_SUBJECTS}
                  className="hidden"
                />
              </div>

              {/* Subjects Preview */}
              {subjects.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5 md:gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="relative border-2 border-slate-900 rounded-xl p-1.5 sm:p-2 bg-slate-100 shadow-[2px_2px_0_0_#0f172a]"
                      >
                        <img
                          src={subject.preview}
                          alt={`Subject ${subject.id}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg"
                        />
                        <p className="text-[9px] sm:text-[10px] font-black text-center mt-1 sm:mt-1.5 text-slate-600 uppercase tracking-widest">
                          Gambar {subjects.indexOf(subject) + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="absolute top-1 right-1 inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full border-2 border-slate-900 hover:bg-red-600 transition-colors shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                2. Deskripsi Penggabungan (Prompt) <span className="text-red-500">*</span>
              </label>
              <p className="text-[10px] text-slate-500 mb-2 sm:mb-3 uppercase tracking-widest">
                Wajib diisi! Deskripsikan bagaimana gambar-gambar akan digabung menjadi 1 foto.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: '5 orang berdiri bersama di pantai, tersenyum, memakai baju casual' atau 'Seseorang berdiri di depan mobil sport dengan background kota'"
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 border-2 border-slate-900 rounded-xl bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-slate-900 resize-none"
                required
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
                Biaya: {creditsPerGenerate} credit per generate Photo Group.
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || subjects.length < 2 || subjects.length > MAX_SUBJECTS || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="text-xs sm:text-sm md:text-base">Memproses...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm md:text-base">Generate Photo Group</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 text-center uppercase tracking-tight">
              Hasil Photo Group
            </h3>
            <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-3 sm:p-4">
              <div className="relative max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                <img
                  src={result}
                  alt="Photo group result"
                  className="w-full h-auto max-h-64 sm:max-h-80 object-contain rounded-xl"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadImageWithWatermark(
                        result,
                        `fresh-creative-photogroup-${Date.now()}.png`
                      );
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Download gagal");
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  disabled={downloading}
                  className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-white rounded-full border-2 border-slate-900 hover:bg-emerald-600 transition-colors shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-70"
                  title="Download (langsung ke device)"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
