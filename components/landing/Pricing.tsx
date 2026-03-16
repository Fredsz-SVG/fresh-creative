'use client';

import { useState, useMemo, useEffect } from "react";
import { Check, Book, Sparkles, Star } from "lucide-react";
import { TiLocationArrow } from "react-icons/ti";
import { apiUrl } from "@/lib/api-url";
import { AnimatedTitle } from "./AnimatedTitle";

type TabType = "digital" | "fisik";

type DigitalPackage = {
  id: string;
  name: string;
  pricePerStudent: number;
  minStudents: number;
  features: string[];
  flipbook_enabled: boolean;
  ai_labs_features: string[];
  is_popular: boolean;
};

const AI_FEATURE_LABELS: Record<string, string> = {
  tryon: "Try On",
  pose: "Pose",
  photogroup: "Photo Group",
  phototovideo: "Photo to Video",
  image_remove_bg: "Image Editor",
  flipbook_unlock: "Flipbook",
};

const COVER_OPTIONS = [
  { id: "standard", label: "Standard Hardcover", add: 0 },
  { id: "canvas", label: "Canvas", add: 150000 },
  { id: "premium", label: "Premium 3D Tunnel View", add: 400000 },
] as const;

const PACKAGING_OPTIONS = [
  { id: "none", label: "Tanpa Packaging", add: 0 },
  { id: "tas", label: "Tas Spunbond", add: 25000 },
  { id: "slop", label: "Slop Case Box", add: 35000 },
  { id: "stemba", label: "Stemba Box", add: 45000 },
  { id: "semi", label: "Semi MDF Box", add: 75000 },
  { id: "full", label: "Full MDF Box", add: 120000 },
] as const;

const FOTOGRAFER_OPTIONS = [
  { id: "tidak", label: "Tidak Perlu", add: 0 },
  { id: "basic", label: "Paket Basic (Rp 4.5jt)", add: 4500000 },
  { id: "pro", label: "Paket Pro (Rp 6.3jt)", add: 6300000 },
  { id: "sultan", label: "Paket Sultan (Rp 8.1jt)", add: 8100000 },
] as const;

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function Pricing() {
  const [tab, setTab] = useState<TabType>("fisik");
  const [digitalPackages, setDigitalPackages] = useState<DigitalPackage[]>([]);
  const [loadingDigital, setLoadingDigital] = useState(true);
  const [selectedDigitalId, setSelectedDigitalId] = useState<string | null>(null);
  const [activeSwipeIndex, setActiveSwipeIndex] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const index = Math.round(scrollLeft / (container.clientWidth * 0.85));
    if (index !== activeSwipeIndex) {
      setActiveSwipeIndex(index);
    }
  };

  const [jumlahSiswa, setJumlahSiswa] = useState(100);
  const [jumlahKelas, setJumlahKelas] = useState(3);
  const [tebalBuku, setTebalBuku] = useState(102);
  const [cover, setCover] = useState<(typeof COVER_OPTIONS)[number]["id"]>("standard");
  const [packaging, setPackaging] = useState<(typeof PACKAGING_OPTIONS)[number]["id"]>("tas");
  const [videoCinematic, setVideoCinematic] = useState(false);
  const [arLivePhoto, setArLivePhoto] = useState(false);
  const [fotografer, setFotografer] = useState<(typeof FOTOGRAFER_OPTIONS)[number]["id"]>("tidak");

  useEffect(() => {
    fetch(apiUrl("/api/pricing"))
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((p: Record<string, unknown>) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            pricePerStudent: Number(p.price_per_student ?? p.pricePerStudent ?? 0),
            minStudents: Number(p.min_students ?? p.minStudents ?? 100),
            features: Array.isArray(p.features) ? p.features.map(String) : [],
            flipbook_enabled: !!p.flipbook_enabled,
            ai_labs_features: Array.isArray(p.ai_labs_features) ? p.ai_labs_features.map(String) : [],
            is_popular: !!p.is_popular,
          }));
          normalized.sort((a, b) => a.pricePerStudent - b.pricePerStudent);
          setDigitalPackages(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDigital(false));
  }, []);

  const estimasi = useMemo(() => {
    const coverOpt = COVER_OPTIONS.find((c) => c.id === cover)!;
    const packOpt = PACKAGING_OPTIONS.find((p) => p.id === packaging)!;
    const printBinding = 254000;
    const coverPack = coverOpt.add + packOpt.add;
    let sharedCost = 0;
    if (videoCinematic) sharedCost += 3000000 / Math.max(1, jumlahSiswa);
    if (arLivePhoto) sharedCost += 32000;
    const cashback = 29000;
    const perSiswa = Math.round(printBinding + coverPack / Math.max(1, jumlahSiswa) + sharedCost - cashback);
    return {
      printBinding,
      coverPack: Math.round(coverPack / Math.max(1, jumlahSiswa)),
      sharedCost: Math.round(sharedCost),
      cashback,
      perSiswa: Math.max(0, perSiswa),
    };
  }, [cover, packaging, videoCinematic, arLivePhoto, jumlahSiswa]);

  return (
    <section id="pricing" className="w-full bg-slate-100 dark:bg-slate-950 py-16 md:py-24 transition-colors duration-500">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <AnimatedTitle containerClass="!text-black dark:!text-white text-center font-zentry">
            {"Harga Jujur <br /> Sejak Awal."}
          </AnimatedTitle>
          <p className="mt-6 text-slate-500 dark:text-white/60 font-general uppercase tracking-widest text-xs md:text-sm">
            Investasi transparan untuk kenangan abadi, tanpa biaya siluman.
          </p>
        </div>

        {/* Tab: Digital | Fisik */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex flex-wrap justify-center rounded-xl border border-slate-900 dark:border-white bg-white dark:bg-slate-900 p-1 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#fff]">
            <button
              type="button"
              onClick={() => setTab("digital")}
              className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                tab === "digital"
                  ? "bg-lime-500 text-slate-900 dark:text-black border border-slate-900 dark:border-white translate-x-[1px] translate-y-[1px] shadow-none"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Digital
            </button>
            <button
              type="button"
              onClick={() => setTab("fisik")}
              className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                tab === "fisik"
                  ? "bg-lime-500 text-slate-900 dark:text-black border border-slate-900 dark:border-white translate-x-[1px] translate-y-[1px] shadow-none"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Cetak Fisik
            </button>
          </div>
        </div>

        {/* Digital: paket dari API */}
        {tab === "digital" && (
          <div className="mx-auto max-w-6xl">
            {loadingDigital ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
              </div>
            ) : digitalPackages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-white/70">
                Belum ada paket digital. Cek lagi nanti.
              </div>
            ) : (
              <>
              <div 
                onScroll={handleScroll}
                className="flex items-stretch overflow-x-auto gap-6 pt-6 pb-8 snap-x no-scrollbar sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pt-0 sm:pb-0 sm:snap-none px-4 sm:px-0"
              >
                {digitalPackages.map((pkg) => {
                  let addonsTotal = 0;
                  pkg.features.forEach((f) => {
                    try {
                      const j = JSON.parse(f);
                      if (j.price) addonsTotal += Number(j.price);
                    } catch {}
                  });
                  const pricePerStudent = pkg.pricePerStudent + addonsTotal;
                  const n = pkg.minStudents;
                  const total = n * pricePerStudent;
                  const isSelected = selectedDigitalId === pkg.id;
                  return (
                    <div key={pkg.id} className="flex min-w-[85%] sm:min-w-0 sm:w-full flex-col snap-center sm:snap-align-none">
                      <button
                        type="button"
                        onClick={() => setSelectedDigitalId(isSelected ? null : pkg.id)}
                        className={`relative w-full h-full rounded-[1.5rem] sm:rounded-[2rem] border-2 p-6 sm:p-8 text-left transition-all duration-300 focus:outline-none flex flex-col ${
                          isSelected
                            ? "border-slate-900 dark:border-white bg-lime-400/10 shadow-none translate-x-[3px] translate-y-[3px]"
                            : "border-slate-900 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#fff] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0_0_#0f172a] dark:hover:shadow-[4px_4px_0_0_#fff]"
                        }`}
                      >
                      {isSelected && (
                        <span className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-lime-400 bg-lime-400/20">
                          <Check className="h-5 w-5 text-lime-400" strokeWidth={3} />
                        </span>
                      )}
                      {pkg.is_popular && !isSelected && (
                        <span className="absolute -top-3 right-4 flex items-center gap-1 rounded-full border border-lime-400/60 bg-slate-950 px-3 py-1 text-xs font-bold uppercase text-lime-400">
                          <Star className="h-3.5 w-3.5 fill-lime-400" />
                          Popular
                        </span>
                      )}
                      <div className="flex-grow">
                        <div className="mb-4 pr-10">
                          <h4 className="font-general text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {pkg.name}
                          </h4>
                          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-white/50">
                            min. {pkg.minStudents} siswa
                          </p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">
                          {formatRupiah(pricePerStudent)}
                          <span className="text-sm font-bold text-slate-500 dark:text-white/60">
                            /siswa
                          </span>
                        </p>
                        <ul className="mt-6 space-y-2 border-t border-slate-100 dark:border-white/10 pt-6">
                          {pkg.features.map((f, i) => {
                            let parsed = { name: f, price: 0 };
                            try {
                              const j = JSON.parse(f);
                              if (j.name) parsed = j;
                            } catch {}
                            return (
                              <li
                                key={i}
                                className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-white/80"
                              >
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-900 dark:border-white bg-lime-400 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]">
                                  <Check
                                    className="h-3 w-3 text-slate-900"
                                    strokeWidth={4}
                                  />
                                </div>
                                <span>{parsed.name}</span>
                              </li>
                            );
                          })}
                        </ul>
                        {(pkg.flipbook_enabled || pkg.ai_labs_features.length > 0) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {pkg.flipbook_enabled &&
                              !pkg.ai_labs_features.includes("flipbook_unlock") && (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-900 dark:border-white bg-lime-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]">
                                  <Book className="h-3 w-3" /> Flipbook
                                </span>
                              )}
                            {pkg.ai_labs_features.map((slug) => (
                              <span
                                key={slug}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-900 dark:border-white bg-cyan-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]"
                              >
                                {slug === "flipbook_unlock" ? (
                                  <Book className="h-3 w-3" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                {AI_FEATURE_LABELS[slug] ?? slug}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4 text-sm">
                        <span className="text-slate-500 dark:text-white/60">
                          Estimasi {n} siswa
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatRupiah(total)}
                        </span>
                      </div>
                      <span
                        className={`mt-6 block w-full rounded-xl py-3 border border-slate-900 dark:border-white text-center text-sm font-black uppercase transition-all duration-300 ${
                          isSelected
                            ? "bg-lime-500 text-white dark:text-black shadow-none"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#fff] group-hover:bg-lime-400"
                        }`}
                      >
                        {isSelected ? "Paket dipilih" : "Pilih Paket"}
                      </span>
                    </button>
                  </div>
                  );
                })}
              </div>

              {/* Mobile Swipe Indicators - Neo Brutalist & Dynamic */}
              <div className="flex justify-center items-center gap-3 mt-4 mb-10 sm:hidden">
                {digitalPackages.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`transition-all duration-300 border border-slate-900 rounded-full ${
                      activeSwipeIndex === idx 
                        ? "h-3 w-10 bg-lime-400 shadow-[2px_2px_0_0_#000]" 
                        : "h-3 w-3 bg-white shadow-[1px_1px_0_0_#000]"
                    }`}
                  />
                ))}
              </div>

              {selectedDigitalId && (
                <div className="mt-12 sm:mt-16 flex flex-col items-center gap-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-900 dark:border-white bg-lime-400 p-6 sm:p-8 text-center shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#fff]">
                  <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    🔥 Mantap! Paket <span className="underline decoration-2">{digitalPackages.find((p) => p.id === selectedDigitalId)?.name}</span> siap diproses.
                  </p>
                  <a
                    href="/login?next=/admin/showroom"
                    className="group inline-flex items-center gap-2 rounded-2xl border border-slate-900 bg-white px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-900 transition-all hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0_0_#0f172a] active:translate-x-0 active:translate-y-0 active:shadow-none"
                  >
                    Lanjutkan Sekarang <TiLocationArrow className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </a>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* Fisik: estimasi budget angkatan (kodingan yang sudah ada) */}
        {tab === "fisik" && (
        <div className="mx-auto max-w-6xl rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-slate-900 dark:border-white bg-white dark:bg-slate-900 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#fff] p-5 sm:p-8 md:p-12">
          <h3 className="font-sans text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-6 sm:mb-10 flex items-center gap-3">
            <span className="h-6 sm:h-8 w-2 bg-lime-500" /> Estimasi Budget Angkatan
          </h3>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr,340px]">
            {/* Left: Input controls */}
            <div className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-2">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2">
                    <label className="text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90">
                      Siswa
                    </label>
                    <span className="text-[11px] sm:text-sm font-semibold text-lime-600 dark:text-lime-400">
                      {jumlahSiswa}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={500}
                    value={jumlahSiswa}
                    onChange={(e) => setJumlahSiswa(Number(e.target.value))}
                    className="pricing-slider-brutalist w-full h-4 rounded-none appearance-none cursor-pointer bg-slate-200 dark:bg-white/20 border border-slate-900 dark:border-white"
                  />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2">
                    <label className="text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90">Kelas</label>
                    <span className="text-[11px] sm:text-sm font-semibold text-lime-600 dark:text-lime-400">
                      {jumlahKelas}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={jumlahKelas}
                    onChange={(e) => setJumlahKelas(Number(e.target.value))}
                    className="pricing-slider-brutalist w-full h-4 rounded-none appearance-none cursor-pointer bg-slate-200 dark:bg-white/20 border border-slate-900 dark:border-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2">
                  <label className="text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90">
                    Tebal Buku
                  </label>
                  <span className="text-[11px] sm:text-sm font-semibold text-lime-600 dark:text-lime-400">
                    {tebalBuku} Hal
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={4}
                  value={tebalBuku}
                  onChange={(e) => setTebalBuku(Number(e.target.value))}
                  className="pricing-slider-brutalist w-full h-4 rounded-none appearance-none cursor-pointer bg-slate-200 dark:bg-white/20 border border-slate-900 dark:border-white"
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-white/50">*Kelipatan 4 halaman</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90 mb-1.5 sm:mb-2">
                    Tipe Cover
                  </label>
                  <select
                    value={cover}
                    onChange={(e) => setCover(e.target.value as typeof cover)}
                    className="w-full rounded-xl border border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#fff] focus:outline-none transition-all shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]"
                  >
                    {COVER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90 mb-1.5 sm:mb-2">
                    Packaging
                  </label>
                  <select
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value as typeof packaging)}
                    className="w-full rounded-xl border border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#fff] focus:outline-none transition-all shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]"
                  >
                    {PACKAGING_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90 mb-2.5 sm:mb-3">Add-ons &amp; Services</p>
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center justify-between gap-4 cursor-pointer py-0.5 sm:py-1">
                    <span className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={videoCinematic}
                        onChange={(e) => setVideoCinematic(e.target.checked)}
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-none border border-slate-900 dark:border-white bg-white dark:bg-slate-800 text-lime-500 focus:ring-0 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff] checked:bg-lime-500"
                      />
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-white/90">
                        Video Cinematic
                      </span>
                    </span>
                    <span className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 font-bold">+3jt</span>
                  </label>
                  <label className="flex items-center justify-between gap-4 cursor-pointer py-0.5 sm:py-1">
                    <span className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={arLivePhoto}
                        onChange={(e) => setArLivePhoto(e.target.checked)}
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-none border border-slate-900 dark:border-white bg-white dark:bg-slate-800 text-lime-500 focus:ring-0 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff] checked:bg-lime-500"
                      />
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-white/90">AR LivePhoto</span>
                    </span>
                    <span className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 font-bold">+32rb</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-sm font-medium text-slate-700 dark:text-white/90 mb-1.5 sm:mb-2">
                  Fotografer
                </label>
                <select
                  value={fotografer}
                  onChange={(e) => setFotografer(e.target.value as typeof fotografer)}
                  className="w-full rounded-xl border border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:shadow-[2px_2px_0_0_#0f172a] dark:focus:shadow-[2px_2px_0_0_#fff] focus:outline-none transition-all shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#fff]"
                >
                  {FOTOGRAFER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Cost summary */}
            <div className="lg:border-l border-slate-100 dark:border-white/10 lg:pl-8 space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[11px] sm:text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white/90">
                  Estimasi Per Siswa
                </h4>
                <span className="rounded-md border border-slate-200 dark:border-white/30 bg-transparent px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-white">
                  Live
                </span>
              </div>

              <p className="text-xl sm:text-4xl font-bold text-lime-600 dark:text-lime-400">
                {formatRupiah(estimasi.perSiswa)}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-white/50">
                *Harga final bisa berubah sesuai negosiasi.
              </p>

              <div className="space-y-1.5 sm:space-y-2 text-[12px] sm:text-sm">
                <div className="flex justify-between text-slate-600 dark:text-white/80">
                  <span>Print &amp; Binding:</span>
                  <span>{formatRupiah(estimasi.printBinding)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-white/80">
                  <span>Cover &amp; Pack:</span>
                  <span>{formatRupiah(estimasi.coverPack)}</span>
                </div>
                <div className="flex justify-between text-cyan-600 dark:text-cyan-400/90 font-medium">
                  <span>Shared Cost:</span>
                  <span>{formatRupiah(estimasi.sharedCost)}</span>
                </div>
                <div className="flex justify-between text-lime-600 dark:text-lime-400 font-bold">
                  <span>Cashback:</span>
                  <span>{formatRupiah(estimasi.cashback)}</span>
                </div>
              </div>

              {!arLivePhoto && (
                <div className="rounded-2xl border border-slate-900 dark:border-white bg-cyan-400 p-4 sm:p-5 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#fff]">
                  <p className="text-[11px] sm:text-sm text-slate-900 font-bold flex items-start gap-2 sm:gap-3">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>
                      <strong className="uppercase underline">Recommended:</strong> Tambah AR
                      LivePhoto!
                    </span>
                  </p>
                </div>
              )}

              <button
                type="button"
                className="group w-full rounded-[1.2rem] sm:rounded-[1.5rem] border border-slate-900 bg-lime-400 px-5 sm:px-8 py-3.5 sm:py-5 text-base sm:text-xl font-black text-slate-900 transition-all hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0_0_#0f172a] active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                Ambil Penawaran <TiLocationArrow className="inline-block ml-1 sm:ml-2 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
