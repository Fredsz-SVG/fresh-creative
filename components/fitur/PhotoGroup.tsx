"use client";
import { useState } from "react";
import { Upload, X, Loader2, Download, Users, Save } from "lucide-react";
import { downloadImageWithWatermark } from "@/lib/download-image";
import { saveToMyFiles } from "@/lib/save-to-files";

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
  const [prompt, setPrompt] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

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

      const res = await fetch("/api/photogroup", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.result) {
        setResult(data.result);
      } else {
        // Handle error status codes
        if (res.status === 402) {
          setError(data.error || "❌ Credit Replicate tidak cukup!");
        } else {
          setError(data.error || "Gagal membuat grup foto");
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
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 text-center">
          Upload 2–10 gambar untuk digabung menjadi satu foto grup.
        </p>

        <form onSubmit={handleGenerateGroup} className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Subjects Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>1. Upload Foto Karakter (Maksimal {MAX_SUBJECTS}) <span className="text-red-500">*</span></span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                Upload maksimal {MAX_SUBJECTS} gambar yang ingin digabung menjadi 1 foto grup.
              </p>
              <div
                onClick={() => document.getElementById("subjects-upload")?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-gray-400" />
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                        className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700"
                      >
                        <img
                          src={subject.preview}
                          alt={`Subject ${subject.id}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg"
                        />
                        <p className="text-[9px] sm:text-[10px] text-center mt-1 sm:mt-1.5 text-gray-600 dark:text-gray-400">
                          Gambar {subjects.indexOf(subject) + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
              <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                2. Deskripsi Penggabungan (Prompt) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                Wajib diisi! Deskripsikan bagaimana gambar-gambar akan digabung menjadi 1 foto.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: '5 orang berdiri bersama di pantai, tersenyum, memakai baju casual' atau 'Seseorang berdiri di depan mobil sport dengan background kota'"
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
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
              disabled={loading || subjects.length < 2 || subjects.length > MAX_SUBJECTS || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 md:px-6 py-2.5 sm:py-2.5 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm sm:text-base font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-6 sm:mt-8 md:mt-12 max-w-4xl mx-auto px-2 sm:px-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-gray-900 dark:text-white text-center">
              Hasil Photo Group
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="relative max-w-xs sm:max-w-sm md:max-w-lg mx-auto">
                <img
                  src={result}
                  alt="Photo group result"
                  className="w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await saveToMyFiles(
                        result,
                        `photogroup-${Date.now()}.png`,
                        "image/png"
                      );
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Gagal menyimpan");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="absolute top-1.5 sm:top-2 right-12 sm:right-14 p-1.5 sm:p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-70"
                  title="Simpan ke File Saya"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadImageWithWatermark(
                        result,
                        `fresh-creative-photogroup-${Date.now()}.png`,
                        { format: "image/png" }
                      );
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Download gagal");
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  disabled={downloading}
                  className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-lg disabled:opacity-70"
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
