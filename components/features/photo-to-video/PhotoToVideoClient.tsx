"use client";
import { useEffect, useState } from "react";
import { Upload, X, Loader2, Download, Video, Mic } from "lucide-react";
import { downloadFileToDevice } from "@/lib/download-file";
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

const DEFAULT_MOTION_PROMPT =
  "Gerakan natural: bernapas halus, gerakan kepala ringan, kontak mata ke kamera.";

const PTV_MIN = 2;
const PTV_MAX = 12;

export default function PhotoToVideo() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [durationSec, setDurationSec] = useState(5);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [durationCredits, setDurationCredits] = useState<Record<number, number>>({});
  const [allowedDurations, setAllowedDurations] = useState<number[]>([5, 10]);
  const [fallbackCredits, setFallbackCredits] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/ai-edit");
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const item = data.find((p: { feature_slug?: string }) => p.feature_slug === "phototovideo");
        if (!item || cancelled) return;
        const fb =
          typeof item.credits_per_use === "number" ? item.credits_per_use : 0;
        setFallbackCredits(fb);
        let o: Record<string, number> = {};
        try {
          if (
            typeof item.duration_credits_json === "string" &&
            item.duration_credits_json.trim()
          ) {
            o = JSON.parse(item.duration_credits_json) as Record<string, number>;
          }
        } catch {
          o = {};
        }
        const secSet = new Set<number>();
        const map: Record<number, number> = {};
        for (const k of Object.keys(o)) {
          const n = parseInt(k, 10);
          if (!Number.isFinite(n) || n < PTV_MIN || n > PTV_MAX) continue;
          secSet.add(n);
          const v = o[k];
          if (typeof v === "number" && v >= 0) map[n] = v;
        }
        if (secSet.size === 0) {
          secSet.add(5);
          secSet.add(10);
          map[5] = fb;
          map[10] = fb;
        }
        const sorted = [...secSet].sort((a, b) => a - b);
        setAllowedDurations(sorted);
        setDurationCredits(map);
      } catch {
        // ignore
      }
    };
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const lastFetchRef = { ts: 0 };
    const onRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; channel?: string; payload?: Record<string, unknown> }>).detail;
      if (!detail?.type || detail.channel !== "global") return;
      if (detail.type !== "api.mutated") return;
      const path = typeof detail.payload?.path === "string" ? (detail.payload.path as string) : "";
      if (path !== "/api/admin/ai-edit") return;
      const now = Date.now();
      if (now - lastFetchRef.ts < 800) return;
      lastFetchRef.ts = now;
      // Re-fetch pricing so all devices update instantly
      void (async () => {
        try {
          const res = await fetchWithAuth("/api/admin/ai-edit?t=" + Date.now());
          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data)) return;
          const item = data.find((p: { feature_slug?: string }) => p.feature_slug === "phototovideo");
          if (!item) return;
          const fb =
            typeof item.credits_per_use === "number" ? item.credits_per_use : 0;
          setFallbackCredits(fb);
          let o: Record<string, number> = {};
          try {
            if (
              typeof item.duration_credits_json === "string" &&
              item.duration_credits_json.trim()
            ) {
              o = JSON.parse(item.duration_credits_json) as Record<string, number>;
            }
          } catch {
            o = {};
          }
          const secSet = new Set<number>();
          const map: Record<number, number> = {};
          for (const k of Object.keys(o)) {
            const n = parseInt(k, 10);
            if (!Number.isFinite(n) || n < PTV_MIN || n > PTV_MAX) continue;
            secSet.add(n);
            const v = o[k];
            if (typeof v === "number" && v >= 0) map[n] = v;
          }
          if (secSet.size === 0) {
            secSet.add(5);
            secSet.add(10);
            map[5] = fb;
            map[10] = fb;
          }
          const sorted = [...secSet].sort((a, b) => a - b);
          setAllowedDurations(sorted);
          setDurationCredits(map);
        } catch {
          // ignore
        }
      })();
    };
    window.addEventListener("fresh:realtime", onRealtime);
    return () => window.removeEventListener("fresh:realtime", onRealtime);
  }, []);

  useEffect(() => {
    if (allowedDurations.length === 0) return;
    if (!allowedDurations.includes(durationSec)) {
      setDurationSec(allowedDurations[0]);
    }
  }, [allowedDurations, durationSec]);

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

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Audio maksimal 5MB.");
        e.target.value = "";
        return;
      }
      setAudioFile(file);
      setError(null);
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
      formData.append("prompt", prompt.trim() || DEFAULT_MOTION_PROMPT);
      formData.append("duration", String(durationSec));
      if (audioFile) {
        formData.append("audio", audioFile);
      }

      const res = await fetchWithAuth("/api/ai-features/phototovideo", {
        method: "POST",
        body: formData,
      });

      const data = asObject(await res.json().catch(() => ({})));

      if (data.ok && data.video) {
        const videoUrl = asString(data.video)
        if (videoUrl) {
          setVideoResult(videoUrl)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('credits-updated'))
          }
        }
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] p-4 sm:p-6 space-y-4 sm:space-y-5">
            <p className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
              Foto → video dengan Seedance 1 Lite; suara asli opsional (Kling lip-sync). Pakaian di foto dijaga; gerak & bicara mengikuti prompt + audio.
            </p>
            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                1. Upload foto
              </label>
              {!photoPreview ? (
                <div
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-slate-200 dark:hover:border-slate-400 transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-slate-400" />
                  <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-300 uppercase tracking-widest">
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
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
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
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10 inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-red-600 transition-colors shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <p className="text-[10px] sm:text-xs font-black mb-2 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                2. Durasi video
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {allowedDurations.map((sec) => (
                  <label
                    key={sec}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-colors ${
                      durationSec === sec
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200"
                        : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      className="sr-only"
                      checked={durationSec === sec}
                      onChange={() => setDurationSec(sec)}
                    />
                    {sec} detik
                  </label>
                ))}
              </div>
            </div>

            {/* Motion prompt */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                3. Instruksi gerakan / adegan
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Jelaskan bagaimana subjek bergerak.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={DEFAULT_MOTION_PROMPT}
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-slate-200 dark:focus:border-slate-500 resize-none"
              />
            </div>

            {/* Audio (optional) */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                4. Suara asli (opsional) — lip-sync
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                Unggah rekaman suara (mp3, wav, atau m4a; maks. 5 MB). Jika ada audio, bibir diselaraskan dengan rekaman tersebut. Jika tidak mengunggah audio, video dihasilkan tanpa suara.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/mp4,audio/aac,.mp3,.wav,.m4a,.aac"
                  onChange={handleAudioUpload}
                  className="text-[10px] sm:text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-2 file:border-slate-200 dark:file:border-slate-600 file:bg-white dark:file:bg-slate-800 file:font-black file:uppercase"
                />
                {audioFile && (
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                    {audioFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-400 rounded-xl text-red-600 dark:text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-pre-line">
                {error}
              </div>
            )}

            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
              Biaya: {durationCredits[durationSec] ?? fallbackCredits} credit untuk{" "}
              {durationSec} detik
              {allowedDurations.length > 1 ? " (pilih durasi di atas)" : ""}.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !photo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-2 border-slate-200 dark:border-slate-600 font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h3 className="text-base sm:text-xl font-black mb-4 text-slate-900 dark:text-white text-center uppercase tracking-tight">
              Hasil Video
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] p-3 sm:p-4">
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
                  className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 text-white rounded-full border-2 border-slate-200 dark:border-slate-600 hover:bg-emerald-600 transition-colors shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-70"
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
