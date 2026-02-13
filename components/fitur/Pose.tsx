"use client";
import { useState } from "react";
import { Upload, X, Loader2, Download, User, Save } from "lucide-react";
import { downloadImageWithWatermark } from "@/lib/download-image";
import { saveToMyFiles } from "@/lib/save-to-files";

export default function Pose() {
  const [subject, setSubject] = useState<File | null>(null);
  const [subjectPreview, setSubjectPreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

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

      const res = await fetch("/api/pose", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.results) {
        // Ensure results is an array
        const resultsArray = Array.isArray(data.results) ? data.results : [data.results];
        setResults(resultsArray);
      } else {
        // Handle error status codes
        if (res.status === 402) {
          setError(data.error || "❌ Credit Replicate tidak cukup!");
        } else {
          setError(data.error || "Gagal mengubah pose");
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
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 text-center">
          Upload foto karakter dan deskripsikan pose yang diinginkan.
        </p>

        <form onSubmit={handleGeneratePose} className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Subject Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>1. Upload Foto Karakter (Subject) <span className="text-red-500">*</span></span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                Upload foto closeup headshot seseorang. Foto square closeup wajah memberikan hasil terbaik.
              </p>
              <div
                onClick={() => document.getElementById("subject-upload")?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {subjectPreview ? (
                  <User className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-green-500" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-gray-400" />
                )}
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                  <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto h-48 sm:h-56 md:h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
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
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                2. Deskripsi Karakter (Prompt) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: 'Foto closeup seorang wanita muda dengan rambut panjang cokelat, memakai sweater abu-abu' atau kosongkan untuk default"
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !subject}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 md:px-6 py-2.5 sm:py-2.5 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm sm:text-base font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-6 sm:mt-8 md:mt-12 max-w-4xl mx-auto px-2 sm:px-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-gray-900 dark:text-white text-center">
              Hasil Pose Transfer ({results.length} gambar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="relative">
                    <img
                      src={result}
                      alt={`Pose result ${index + 1}`}
                      className="w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setSavingIndex(index);
                        try {
                          await saveToMyFiles(
                            result,
                            `pose-${index + 1}-${Date.now()}.png`,
                            "image/png"
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Gagal menyimpan");
                        } finally {
                          setSavingIndex(null);
                        }
                      }}
                      disabled={savingIndex !== null}
                      className="absolute top-1.5 sm:top-2 right-12 sm:right-14 p-1.5 sm:p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-70"
                      title="Simpan ke File Saya"
                    >
                      {savingIndex === index ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
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
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-lg disabled:opacity-70"
                      title="Download (langsung ke device)"
                    >
                      {downloadingIndex === index ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
                    <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      #{index + 1}
                    </div>
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
