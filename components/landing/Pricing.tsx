'use client';

import { useState, useMemo, useEffect } from "react";
import { Check, Book, Sparkles, Star } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

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
    <section id="pricing" className="w-full bg-[#0d0d0d] py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="special-font text-4xl font-bold uppercase md:text-5xl text-white">
            Harga <span className="text-lime-400">Jujur</span> sejak Awal.
          </h2>
          <p className="mt-4 text-white/60 font-general uppercase tracking-widest text-xs md:text-sm">
            Investasi transparan untuk kenangan abadi, tanpa biaya siluman.
          </p>
        </div>

        {/* Tab: Digital | Fisik */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border border-white/20 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTab("digital")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                tab === "digital"
                  ? "bg-lime-400 text-black"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Digital
            </button>
            <button
              type="button"
              onClick={() => setTab("fisik")}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                tab === "fisik"
                  ? "bg-lime-400 text-black"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Fisik
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedDigitalId(isSelected ? null : pkg.id)}
                      className={`relative w-full rounded-2xl border p-6 text-left transition-all focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#0d0d0d] ${
                        isSelected
                          ? "border-lime-400 bg-lime-400/10 shadow-[0_0_0_2px_rgba(163,230,53,0.5)]"
                          : pkg.is_popular
                            ? "border-lime-400/60 bg-[#141414] shadow-[0_0_0_1px_rgba(163,230,53,0.3)] hover:border-lime-400/80"
                            : "border-white/10 bg-[#141414] hover:border-white/20"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-lime-400 bg-lime-400/20">
                          <Check className="h-5 w-5 text-lime-400" strokeWidth={3} />
                        </span>
                      )}
                      {pkg.is_popular && !isSelected && (
                        <span className="absolute -top-3 right-4 flex items-center gap-1 rounded-full border border-lime-400/60 bg-[#0d0d0d] px-3 py-1 text-xs font-bold uppercase text-lime-400">
                          <Star className="h-3.5 w-3.5 fill-lime-400" />
                          Popular
                        </span>
                      )}
                      <div className="mb-4 pr-10">
                        <h4 className="font-general text-lg font-bold text-white">
                          {pkg.name}
                        </h4>
                        <p className="mt-1 text-xs text-white/50">
                          min. {pkg.minStudents} siswa
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-lime-400">
                        {formatRupiah(pricePerStudent)}
                        <span className="text-sm font-normal text-white/60">
                          /siswa
                        </span>
                      </p>
                      <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        {pkg.features.map((f, i) => {
                          let parsed = { name: f, price: 0 };
                          try {
                            const j = JSON.parse(f);
                            if (j.name) parsed = j;
                          } catch {}
                          return (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-white/80"
                            >
                              <Check
                                className="h-4 w-4 shrink-0 text-lime-400"
                                strokeWidth={3}
                              />
                              <span>{parsed.name}</span>
                            </li>
                          );
                        })}
                      </ul>
                      {(pkg.flipbook_enabled || pkg.ai_labs_features.length > 0) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {pkg.flipbook_enabled &&
                            !pkg.ai_labs_features.includes("flipbook_unlock") && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-lime-400/90">
                                <Book className="h-3.5 w-3.5" /> Flipbook
                              </span>
                            )}
                          {pkg.ai_labs_features.map((slug) => (
                            <span
                              key={slug}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-cyan-400/90"
                            >
                              {slug === "flipbook_unlock" ? (
                                <Book className="h-3.5 w-3.5" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              {AI_FEATURE_LABELS[slug] ?? slug}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                        <span className="text-white/60">
                          Estimasi {n} siswa
                        </span>
                        <span className="font-semibold text-white">
                          {formatRupiah(total)}
                        </span>
                      </div>
                      <span
                        className={`mt-4 block w-full rounded-xl py-3 text-center text-sm font-bold transition ${
                          isSelected
                            ? "bg-lime-400 text-black"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {isSelected ? "Paket dipilih" : "Klik untuk pilih"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDigitalId && (
                <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-lime-400/30 bg-[#141414] p-6 text-center">
                  <p className="text-sm text-white/80">
                    Paket <span className="font-bold text-lime-400">{digitalPackages.find((p) => p.id === selectedDigitalId)?.name}</span> dipilih.
                  </p>
                  <a
                    href="/login?next=/admin/showroom"
                    className="inline-block rounded-xl bg-lime-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-lime-300"
                  >
                    Lanjutkan
                  </a>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* Fisik: estimasi budget angkatan (kodingan yang sudah ada) */}
        {tab === "fisik" && (
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#141414] p-6 md:p-8">
          <h3 className="font-general text-sm uppercase tracking-wide text-white/70 mb-8">
            Estimasi Budget Angkatan
          </h3>

          <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
            {/* Left: Input controls */}
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-white/90">
                      Jumlah Pasukan (Siswa)
                    </label>
                    <span className="text-sm font-semibold text-lime-400">
                      {jumlahSiswa} Siswa
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={500}
                    value={jumlahSiswa}
                    onChange={(e) => setJumlahSiswa(Number(e.target.value))}
                    className="pricing-slider w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 accent-lime-400"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-white/90">Jumlah Kelas</label>
                    <span className="text-sm font-semibold text-lime-400">
                      {jumlahKelas} Kelas
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={jumlahKelas}
                    onChange={(e) => setJumlahKelas(Number(e.target.value))}
                    className="pricing-slider w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 accent-lime-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white/90">
                    Tebal Buku (Halaman)
                  </label>
                  <span className="text-sm font-semibold text-lime-400">
                    {tebalBuku} Halaman
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={4}
                  value={tebalBuku}
                  onChange={(e) => setTebalBuku(Number(e.target.value))}
                  className="pricing-slider w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 accent-lime-400"
                />
                <p className="mt-1 text-xs text-white/50">*Kelipatan 4 halaman</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Tipe Cover
                  </label>
                  <select
                    value={cover}
                    onChange={(e) => setCover(e.target.value as typeof cover)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white text-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  >
                    {COVER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Packaging
                  </label>
                  <select
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value as typeof packaging)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white text-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                  >
                    {PACKAGING_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-white/90 mb-3">Add-ons &amp; Services</p>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 cursor-pointer py-1">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={videoCinematic}
                        onChange={(e) => setVideoCinematic(e.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-white/5 text-lime-400 focus:ring-lime-400"
                      />
                      <span className="text-sm text-white/90">
                        Jasa Video Cinematic Angkatan
                      </span>
                    </span>
                    <span className="text-sm text-cyan-400">+Rp 3jt</span>
                  </label>
                  <label className="flex items-center justify-between gap-4 cursor-pointer py-1">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={arLivePhoto}
                        onChange={(e) => setArLivePhoto(e.target.checked)}
                        className="h-4 w-4 rounded border-white/30 bg-white/5 text-lime-400 focus:ring-lime-400"
                      />
                      <span className="text-sm text-white/90">AR LivePhoto (Scan App)</span>
                    </span>
                    <span className="text-sm text-cyan-400">+Rp 32rb/buku</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Fotografer
                </label>
                <select
                  value={fotografer}
                  onChange={(e) => setFotografer(e.target.value as typeof fotografer)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white text-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                >
                  {FOTOGRAFER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-gray-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Cost summary */}
            <div className="lg:border-l border-white/10 lg:pl-8 space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                  Estimasi Per Siswa
                </h4>
                <span className="rounded-md border border-white/30 bg-transparent px-2 py-0.5 text-xs font-medium text-white">
                  Real-time
                </span>
              </div>

              <p className="text-3xl md:text-4xl font-bold text-lime-400">
                {formatRupiah(estimasi.perSiswa)}
              </p>
              <p className="text-xs text-white/50">
                *Harga final bisa berubah sesuai negosiasi.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/80">
                  <span>Print &amp; Binding:</span>
                  <span>{formatRupiah(estimasi.printBinding)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Cover &amp; Pack:</span>
                  <span>{formatRupiah(estimasi.coverPack)}</span>
                </div>
                <div className="flex justify-between text-cyan-400/90">
                  <span>Shared Cost (Foto/Video):</span>
                  <span>{formatRupiah(estimasi.sharedCost)}</span>
                </div>
                <div className="flex justify-between text-lime-400">
                  <span>Cashback Panitia:</span>
                  <span>{formatRupiah(estimasi.cashback)}</span>
                </div>
              </div>

              {!arLivePhoto && (
                <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                  <p className="text-sm text-white/90 flex items-start gap-2">
                    <span className="text-lime-400 shrink-0" aria-hidden>
                      ✦
                    </span>
                    <span>
                      <strong className="text-lime-400">Recommended Upgrade:</strong> Tambah AR
                      LivePhoto cuma +Rp 32rb/siswa biar yearbook makin gokil!
                    </span>
                  </p>
                </div>
              )}

              <button
                type="button"
                className="w-full rounded-xl bg-lime-400 px-6 py-4 text-base font-bold text-black transition hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#141414]"
              >
                Ambil Penawaran Ini
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
