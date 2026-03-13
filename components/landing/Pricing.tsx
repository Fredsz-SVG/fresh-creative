'use client';

import { useState, useMemo } from "react";

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
  const [jumlahSiswa, setJumlahSiswa] = useState(100);
  const [jumlahKelas, setJumlahKelas] = useState(3);
  const [tebalBuku, setTebalBuku] = useState(102);
  const [cover, setCover] = useState<(typeof COVER_OPTIONS)[number]["id"]>("standard");
  const [packaging, setPackaging] = useState<(typeof PACKAGING_OPTIONS)[number]["id"]>("tas");
  const [videoCinematic, setVideoCinematic] = useState(false);
  const [arLivePhoto, setArLivePhoto] = useState(false);
  const [fotografer, setFotografer] = useState<(typeof FOTOGRAFER_OPTIONS)[number]["id"]>("tidak");

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
          <h2 className="font-zentry text-3xl font-black uppercase md:text-4xl text-white">
            Harga Transparan.
          </h2>
          <p className="font-zentry text-3xl font-black uppercase md:text-4xl mt-1 text-white">
            Tanpa Hidden Fees.
          </p>
        </div>

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
      </div>
    </section>
  );
}
