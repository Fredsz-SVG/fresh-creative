"use client";
import { useEffect, useState } from "react";
import { Upload, X, Loader2, Download, Video, Save } from "lucide-react";
import { downloadFileToDevice } from "@/lib/download-file";
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

const DEFAULT_PROMPT = "A cinematic video with smooth motion and natural movement";

export default function PhotoToVideo() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creditsPerGenerate, setCreditsPerGenerate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/ai-edit");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const item = data.find((p: any) => p.feature_slug === "phototovideo");
        if (!item || cancelled) return;
        if (typeof item.credits_per_use === "number") {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) {
      setError("Silakan upload foto terlebih dahulu!");
      return;
    }

    setLoading(true);
    setVideoResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("prompt", prompt.trim() || DEFAULT_PROMPT);

      const res = await fetchWithAuth("/api/ai-features/phototovideo", {
        method: "POST",
        body: formData,
      });

      const data = asObject(await res.json().catch(() => ({})));

      if (data.ok && data.video) {
        const videoUrl = asString(data.video)
        if (videoUrl) setVideoResult(videoUrl);
      } else {
        setError(asString(data.error) || "Gagal menghasilkan video");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="phototovideo" className="py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleGenerateVideo}>
          <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 text-center uppercase tracking-widest">
              Upload foto dan tambahkan prompt untuk menghasilkan video.
            </p>
            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Upload Foto:
              </label>
              {!photoPreview ? (
                <div
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-900 transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                  <p className="text-[10px] sm:text-sm text-slate-600 uppercase tracking-widest">
                    Klik untuk upload foto
                  </p>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    required
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto">
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-slate-100 rounded-xl border-2 border-slate-900 flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#0f172a]">
                    <img
                      src={photoPreview}
                      alt="Photo preview"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full border-2 border-slate-900 hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt for video generation */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 uppercase tracking-tight">
                Prompt (opsional):
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Deskripsikan adegan video. Kosongkan = default."
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 border-2 border-slate-900 rounded-xl bg-white text-slate-900 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-slate-900 resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-pre-line">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === "number" && creditsPerGenerate >= 0 && (
              <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-widest">
                Biaya: {creditsPerGenerate} credit per generate Photo to Video.
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !photo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-900 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="text-xs sm:text-sm md:text-base">Memproses...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm md:text-base">Generate Video</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Video Result */}
        {videoResult && (
          <div className="mt-6 sm:mt-8 max-w-3xl mx-auto px-2 sm:px-4">
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 text-center uppercase tracking-tight">
              Hasil Video
            </h3>
            <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-3 sm:p-4">
              <div className="relative max-w-xs sm:max-w-sm md:max-w-lg mx-auto">
                <video
                  src={videoResult}
                  controls
                  className="w-full h-auto max-h-64 sm:max-h-80 rounded-xl"
                >
                  Browser Anda tidak mendukung video tag.
                </video>
                <button
                  type="button"
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadFileToDevice(
                        videoResult,
                        `fresh-creative-photo-to-video-${Date.now()}.mp4`
                      );
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Download gagal");
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  disabled={downloading}
                  className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-emerald-500 text-white rounded-full border-2 border-slate-900 hover:bg-emerald-600 transition-colors shadow-[2px_2px_0_0_#0f172a] disabled:opacity-70"
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
