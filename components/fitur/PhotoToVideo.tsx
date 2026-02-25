"use client";
import { useEffect, useState } from "react";
import { Upload, X, Loader2, Download, Video, Save } from "lucide-react";
import { downloadFileToDevice } from "@/lib/download-file";

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
        const res = await fetch("/api/ai/pricing");
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

      const res = await fetch("/api/phototovideo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.video) {
        setVideoResult(data.video);
      } else {
        setError(data.error || "Gagal menghasilkan video");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="phototovideo" className="py-4 md:py-6">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleGenerateVideo} className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-5 md:space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Upload foto dan tambahkan prompt untuk menghasilkan video.
            </p>
            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Upload Foto:
              </label>
              {!photoPreview ? (
                <div
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-400" />
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
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
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
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
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt for video generation */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                Prompt (opsional):
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Deskripsikan adegan video. Kosongkan = default."
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            {typeof creditsPerGenerate === "number" && creditsPerGenerate >= 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Biaya: {creditsPerGenerate} credit per generate Photo to Video.
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !photo}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 md:px-6 py-2.5 sm:py-2.5 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm sm:text-base font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-6 sm:mt-8 md:mt-12 max-w-4xl mx-auto px-2 sm:px-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-gray-900 dark:text-white text-center">
              Hasil Video
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="relative max-w-xs sm:max-w-sm md:max-w-lg mx-auto">
                <video
                  src={videoResult}
                  controls
                  className="w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 rounded-lg"
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
                  className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-70"
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
