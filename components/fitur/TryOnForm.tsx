'use client';
import { useState } from 'react';
import { Upload, X, Loader2, Download, Shirt, User } from 'lucide-react';
import { downloadImageWithWatermark } from '@/lib/download-image';

interface Garment {
  file: File;
  preview: string;
  id: number;
  category?: string;
}

interface Result {
  id: number;
  result: string;
  garmentPreview: string;
  garmentName: string;
}

const MAX_GARMENTS = 2;

export default function TryonForm() {
  const [human, setHuman] = useState<File | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [humanPreview, setHumanPreview] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleHumanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHuman(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHumanPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalAfterAdd = garments.length + newFiles.length;

    if (totalAfterAdd > MAX_GARMENTS) {
      setError(`Maksimal ${MAX_GARMENTS} garment per generate. Anda sudah memiliki ${garments.length} garment.`);
      e.target.value = ""; // Reset input
      return;
    }

    setError(null);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGarments((prev) => [
          ...prev,
          {
            file: file,
            preview: reader.result as string,
            id: Date.now() + Math.random(),
            category: "upper_body", // Default category
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ""; // Reset input untuk allow upload same file again
  };

  const removeGarment = (id: number) => {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  };

  const setGarmentCategory = (id: number, category: string) => {
    setGarments((prev) => prev.map((g) => (g.id === id ? { ...g, category } : g)));
  };

  const handleTryOn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!human || garments.length === 0) {
      setError("Upload foto manusia dan minimal 1 garment!");
      return;
    }

    if (garments.length > MAX_GARMENTS) {
      setError(`Maksimal ${MAX_GARMENTS} garment per generate!`);
      return;
    }

    setLoading(true);
    setResults([]);
    setCurrentProcessing(0);
    setError(null);

    try {
      // Chain processing: hasil pertama jadi input kedua (untuk multiple garments di satu foto)
      // Hasil akhir adalah 1 foto yang sudah memakai semua garment sekaligus (cost-effective)
      const formData = new FormData();
      formData.append("human_img", human);
      formData.append("mode", "chain");
      garments.forEach((garment, index) => {
        formData.append("garments", garment.file);
        formData.append(`category_${index}`, garment.category || "upper_body");
      });
      formData.append("crop", "true");

      // Update progress for each garment being processed
      for (let i = 0; i < garments.length; i++) {
        setCurrentProcessing(i + 1);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update
      }

      const res = await fetch("/api/tryon", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.results && data.results.length > 0) {
        // Chain mode returns only 1 result (final combined image with all garments)
        // Show the final result (1 foto dengan semua garment)
        const finalResult = data.results[0]; // Chain mode returns array with 1 element (final result)

        setResults([{
          id: Date.now(), // Unique ID for combined result
          result: finalResult,
          garmentPreview: garments.map(g => g.preview).join(","), // Show all garments preview
          garmentName: `Hasil Final (${garments.length} Garment${garments.length > 1 ? "s" : ""})`,
        }]);
      } else {
        setError(data.error || "Error processing garments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setCurrentProcessing(0);
    }
  };

  return (
    <section id="tryon" className="py-4 md:py-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4 text-gray-900 dark:text-white">
            Virtual Try-On
          </h2>

        </div>

        <form onSubmit={handleTryOn} className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Human Image Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Upload Foto Manusia:
              </label>
              {!humanPreview ? (
                <div
                  onClick={() => document.getElementById("human-upload")?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-400" />
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                    Klik untuk upload foto manusia
                  </p>
                  <input
                    id="human-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleHumanUpload}
                    required
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto">
                  <div className="relative w-full h-48 sm:h-56 md:h-64 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                    <img
                      src={humanPreview}
                      alt="Human preview"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setHuman(null);
                        setHumanPreview(null);
                      }}
                      className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Multiple Garments Upload */}
            <div>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Upload Garment Images (Maksimal {MAX_GARMENTS}):
              </label>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2">
                Setelah upload, pilih <strong>Jenis</strong> tiap garment: <strong>Baju (atas)</strong> atau <strong>Celana (bawah)</strong> agar hasil try-on benar.
              </p>
              <div
                onClick={() => document.getElementById("garment-upload")?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-5 md:p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-gray-400" />
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Klik untuk upload garment ({garments.length}/{MAX_GARMENTS})
                </p>
                <input
                  id="garment-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleGarmentUpload}
                  multiple
                  disabled={garments.length >= MAX_GARMENTS}
                  className="hidden"
                />
              </div>

              {/* Garment Previews */}
              {garments.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3">
                    {garments.map((garment, index) => (
                      <div
                        key={garment.id}
                        className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-1.5 sm:p-2 bg-gray-50 dark:bg-gray-700"
                      >
                        <img
                          src={garment.preview}
                          alt={`Garment ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg"
                        />
                        <p className="text-[9px] sm:text-[10px] text-center mt-1 sm:mt-1.5 text-gray-600 dark:text-gray-400">
                          Garment {index + 1}
                        </p>
                        <label className="block text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-1 mb-0.5">
                          Jenis:
                        </label>
                        <select
                          value={garment.category || "upper_body"}
                          onChange={(e) => setGarmentCategory(garment.id, e.target.value)}
                          className="w-full px-1.5 py-1 text-[9px] sm:text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary"
                        >
                          <option value="upper_body">Baju (atas)</option>
                          <option value="lower_body">Celana (bawah)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeGarment(garment.id)}
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

            {/* Info: Chain Mode (Always Active) */}
            {garments.length > 1 && (
              <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">✨ Mode Otomatis:</span> Hasil akhir akan menjadi 1 foto dengan semua garment sekaligus (baju + celana + jaket dll) - Cost efektif
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !human || garments.length === 0}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 md:px-6 py-2.5 sm:py-2.5 md:py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm sm:text-base font-medium hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="text-xs sm:text-sm md:text-base">Processing {currentProcessing}/{garments.length}...</span>
                </>
              ) : (
                <>
                  <Shirt className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm md:text-base">Try On {garments.length} Garment{garments.length > 1 ? "s" : ""}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-6 sm:mt-8 md:mt-12 max-w-6xl mx-auto px-2 sm:px-4">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-gray-900 dark:text-white text-center">
              Hasil Try-On (1 Foto dengan Semua Garment)
            </h3>
            <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 max-w-2xl mx-auto">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900 dark:text-white">
                    {result.garmentName}
                  </h4>

                  {/* Original Garments - Show all */}
                  <div className="mb-3 sm:mb-4">
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">Original Garments ({garments.length}):</p>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {garments.map((garment, idx) => (
                        <img
                          key={garment.id}
                          src={garment.preview}
                          alt={`Garment ${idx + 1}`}
                          className="w-full h-16 sm:h-20 md:h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Try-on Result */}
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
                      Hasil Final (Semua Garment):
                    </p>
                    <div className="relative max-w-xs sm:max-w-sm md:max-w-lg mx-auto">
                      <img
                        src={result.result}
                        alt={`Try-on result ${index + 1}`}
                        className="w-full h-auto max-h-64 sm:max-h-80 md:max-h-96 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setDownloadingId(result.id);
                          try {
                            await downloadImageWithWatermark(
                              result.result,
                              `fresh-creative-tryon-${Date.now()}.jpg`
                            );
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Download gagal");
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        disabled={downloadingId === result.id}
                        className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1.5 sm:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-70"
                        title="Download (langsung ke device)"
                      >
                        {downloadingId === result.id ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </button>
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
