'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, X } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type BeforeAfterDemoKey = "ootd" | "thematic";

export function About() {
  const [isPhygitalVideoOpen, setIsPhygitalVideoOpen] = useState(false);
  const [activeBeforeAfter, setActiveBeforeAfter] = useState<BeforeAfterDemoKey | null>(null);
  const [beforeAfterPct, setBeforeAfterPct] = useState(52);

  const phygitalVideoSrc = useMemo(() => "/videos/livephoto.webm", []);
  const beforeAfterDemos = useMemo(
    () => ({
      // NOTE: assets before/after khusus belum tersedia.
      // Ganti path di bawah ke gambar asli saat sudah ada di `public/`.
      ootd: {
        title: "AI Fashion & OOTD",
        beforeSrc: "/img/tryon-1.webp",
        afterSrc: "/img/tryon-2.webp",
      },
      thematic: {
        title: "Thematic Transformation",
        beforeSrc: "/img/thema-1.webp",
        afterSrc: "/img/thema-2.webp",
      },
    }),
    []
  );

  const activeBeforeAfterDemo = activeBeforeAfter ? beforeAfterDemos[activeBeforeAfter] : null;
  const closeBeforeAfter = useCallback(() => setActiveBeforeAfter(null), []);

  useEffect(() => {
    if (!isPhygitalVideoOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPhygitalVideoOpen]);

  useEffect(() => {
    if (!activeBeforeAfter) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBeforeAfter();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeBeforeAfter, closeBeforeAfter]);

  return (
    <section
      id="about"
      className="relative w-full bg-slate-100 dark:bg-[#0a0c37] py-16 sm:py-20 md:py-24 lg:py-32 transition-colors duration-500 overflow-hidden"
    >
      <div className="container mx-auto px-6 sm:px-10 md:px-16">
        {/* Intro Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 sm:mb-20 md:mb-24 px-4"
        >
          <div className="inline-grid grid-cols-[auto_1fr] items-center mb-10 sm:mb-14 border-2 border-slate-950 dark:border-[#5cecff]/30 rounded-xl overflow-hidden bg-white dark:bg-[#0d1148] shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5">
            <div className="bg-slate-950 dark:bg-[#131a68] p-2.5 sm:p-3 border-r-2 border-slate-950 dark:border-[#5cecff]/30 text-lime-400">
              <Award size={18} />
            </div>
            <div className="px-5 py-2 font-black text-[10px] sm:text-xs uppercase tracking-[0.25em] text-slate-900 dark:text-white">
              Established Since 2013
            </div>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-[1.1]">
            Fresh Creative <br className="sm:hidden" /> <span className="text-orange-500">Indonesia</span>
          </h2>
          <h3 className="mt-4 text-lg sm:text-2xl md:text-3xl font-bold text-orange-500/80 dark:text-orange-400/80 italic leading-snug">
            Elevating Digital Creativity through Generative AI
          </h3>
          <p className="mt-10 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed font-medium px-2">
            Didirikan pada tahun 2013 dan kini beroperasi sebagai PT Perseorangan sejak 2022, Fresh Creative Indonesia adalah perusahaan kreatif digital berbasis di Salatiga. Kami berfokus pada pengembangan ekosistem SaaS yang mengintegrasikan kecerdasan buatan (Generative AI) untuk menciptakan produk kreatif yang inovatif dan relevan dengan perkembangan zaman.
          </p>
        </motion.div>

        {/* Vision & Mission Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-20 sm:mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative p-8 sm:p-10 rounded-tl-[40px] rounded-br-[40px] rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-sky-300 to-sky-100 dark:from-[#131a68] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#5cecff]/25 shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-sky-400 dark:bg-[#5cecff]/15 border-2 border-sky-500 dark:border-[#5cecff]/40 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
              <DotLottieReact
                src="/lottie/community.json"
                loop
                autoplay
                className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
              />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 leading-none">
              Visi
            </h3>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Menjadi pionir dalam transformasi industri kreatif digital melalui pemanfaatan teknologi AI yang inklusif dan ekspresif.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-8 sm:p-10 rounded-tl-[40px] rounded-br-[40px] rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-emerald-300 to-emerald-100 dark:from-[#131a68] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#ff61c6]/25 shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-emerald-400 dark:bg-[#f4ff61]/10 border-2 border-emerald-500 dark:border-[#f4ff61]/35 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
              <DotLottieReact
                src="/lottie/roket.json"
                loop
                autoplay
                className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
              />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 leading-none">
              Misi
            </h3>
            <ul className="space-y-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              <li className="flex items-start gap-4">
                <span className="w-6 h-6 rounded-lg bg-lime-500 flex items-center justify-center text-white text-xs font-bold mt-1 shrink-0">1</span>
                <span>Mengembangkan solusi SaaS berbasis AI yang memudahkan pengguna dalam berekspresi secara visual.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="w-6 h-6 rounded-lg bg-lime-500 flex items-center justify-center text-white text-xs font-bold mt-1 shrink-0">2</span>
                <span>Membawa teknologi mutakhir seperti AI ke dalam produk kreatif sehari-hari.</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="w-6 h-6 rounded-lg bg-lime-500 flex items-center justify-center text-white text-xs font-bold mt-1 shrink-0">3</span>
                <span>Memberdayakan kreativitas lokal melalui fitur-fitur tematik yang mengangkat kekayaan budaya Indonesia dan tren global.</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Featured Product Section */}
        <div className="mb-20 sm:mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Produk Unggulan:{" "}
              <a
                href="#demo-ebook"
                className="inline-flex items-baseline font-black leading-none uppercase text-lime-500 underline decoration-4 underline-offset-8 cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-[#0a0c37] rounded-sm"
                aria-label="Buka demo Ebook Smart Digital"
              >
                Smart Digital Yearbook
              </a>
            </h2>
            <p className="mt-6 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">
              Developed Since Q4 2025 • Powered by AILabs
            </p>
            <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
              Interaktif geser kartu untuk memilih dan melihat profil siswa dengan cepat.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            <button
              type="button"
              onClick={() => {
                setBeforeAfterPct(52);
                setActiveBeforeAfter("ootd");
              }}
              className="group relative p-8 sm:p-10 text-left rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-pink-300 to-pink-100 dark:from-[#1a0d4a] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#ff61c6]/30 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-[#0a0c37]"
              aria-label="Buka demo before-after AI Fashion & OOTD"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-pink-400 dark:bg-[#ff61c6]/15 border-2 border-pink-500 dark:border-[#ff61c6]/45 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/shirt.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-1 tracking-tight">AI Fashion &amp; OOTD</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Siswa dapat mengekspresikan gaya personal mereka tanpa batas melalui virtual try-on dan modifikasi busana digital.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setBeforeAfterPct(52);
                setActiveBeforeAfter("thematic");
              }}
              className="group relative p-8 sm:p-10 text-left rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-fuchsia-300 to-fuchsia-100 dark:from-[#1a0d4a] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#ff61c6]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-[#0a0c37]"
              aria-label="Buka demo before-after Thematic Transformation"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-fuchsia-400 dark:bg-[#ff61c6]/15 border-2 border-fuchsia-500 dark:border-[#ff61c6]/40 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/sparkle.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-1 tracking-tight">Thematic Transformation</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Mengubah foto individu atau grup menjadi karya seni bertema khusus secara instan (contoh: Tema Budaya Nusantara, Sci-Fi, Cyberpunk).
              </p>
            </button>
          </div>
        </div>

        {activeBeforeAfterDemo && (
          <div
            className="fixed inset-0 z-[310] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={activeBeforeAfterDemo.title}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeBeforeAfter();
            }}
          >
            <div className="relative w-fit max-w-[92vw] rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-[#0d1148] shadow-[6px_6px_0_0_#0f172a] dark:shadow-neo-glow overflow-hidden">
              <button
                type="button"
                onClick={closeBeforeAfter}
                className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-10 w-10 rounded-xl border-2 border-slate-900 bg-white/90 hover:bg-white transition active:scale-95"
                aria-label="Tutup"
              >
                <X className="h-5 w-5 text-slate-900" />
              </button>

              <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                <div className="pr-12">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeBeforeAfterDemo.title}
                  </h3>
                </div>
              </div>

              <div className="px-5 sm:px-6 pb-6">
                <div className="relative bg-black rounded-xl overflow-hidden border-2 border-slate-900 dark:border-white/15">
                  <div className="relative">
                    <img
                      src={activeBeforeAfterDemo.afterSrc}
                      alt="After"
                      className="block w-auto h-auto max-w-[92vw] max-h-[72vh] object-contain select-none pointer-events-none"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${beforeAfterPct}%` }} aria-hidden="true">
                      <img
                        src={activeBeforeAfterDemo.beforeSrc}
                        alt="Before"
                        className="block w-auto h-auto max-w-[92vw] max-h-[72vh] object-contain select-none pointer-events-none"
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    <div className="absolute inset-y-0" style={{ left: `${beforeAfterPct}%` }} aria-hidden="true">
                      <div className="absolute inset-y-0 -translate-x-1/2 w-[3px] bg-white/90 shadow-[0_0_0_2px_rgba(15,23,42,0.9)]" />
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          <span className="block w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-slate-900" />
                          <span className="block w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-slate-900" />
                        </div>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={beforeAfterPct}
                      onChange={(e) => setBeforeAfterPct(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                      aria-label="Geser pembatas before-after"
                    />

                    <div
                      className="absolute bottom-3"
                      style={{ left: `${beforeAfterPct}%` }}
                      aria-hidden="true"
                    >
                      <div className="-translate-x-1/2 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-black/70 text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                          Before
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/70 text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                          After
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phygital Product Section */}
        <div className="mb-20 sm:mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Produk Tambahan:{" "}
              <button
                type="button"
                onClick={() => setIsPhygitalVideoOpen(true)}
                className="inline-flex items-baseline font-black leading-none uppercase appearance-none bg-transparent p-0 text-orange-500 underline decoration-4 underline-offset-8 cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-[#0a0c37] rounded-sm"
                aria-label="Buka video demo Phygital Yearbook"
              >
                Phygital Yearbook
              </button>
            </h2>
            <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
              Buku fisik yang terhubung ke pengalaman digital, cukup scan untuk menghidupkan momen.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-violet-300 to-violet-100 dark:from-[#1a0d4a] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#5cecff]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-violet-400 dark:bg-[#5cecff]/15 border-2 border-violet-500 dark:border-[#5cecff]/40 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/image.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-1 tracking-tight">Scan QR di Buku</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Di tiap halaman/foto ada QR yang bisa kamu scan lewat HP. Sekali scan, sistem langsung mengenali foto yang dipindai.
              </p>
            </div>

            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-sky-300 to-sky-100 dark:from-[#1a0d4a] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#5cecff]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-sky-400 dark:bg-[#5cecff]/15 border-2 border-sky-500 dark:border-[#5cecff]/40 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/sparkle.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-1 tracking-tight">Hasilnya Foto Jadi Video</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Setelah discan, foto tampil sebagai video atau animasi singkat, lengkap dengan audio. Jadi momen terasa “hidup”, bukan cuma foto diam.
              </p>
            </div>
          </div>
        </div>

        {isPhygitalVideoOpen && (
          <div
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Video demo Phygital Yearbook"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsPhygitalVideoOpen(false);
            }}
          >
            <div className="relative w-fit max-w-[92vw] rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-[#0d1148] shadow-[6px_6px_0_0_#0f172a] dark:shadow-neo-glow overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPhygitalVideoOpen(false)}
                className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-10 w-10 rounded-xl border-2 border-slate-900 bg-white/90 hover:bg-white transition active:scale-95"
                aria-label="Tutup"
              >
                <X className="h-5 w-5 text-slate-900" />
              </button>

              <div className="bg-black">
                <video
                  src={phygitalVideoSrc}
                  className="block w-auto h-auto max-w-[92vw] max-h-[78vh] object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-20 sm:mt-24 md:mt-32">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 sm:mb-20"
          >
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
              Kenapa Memilih <br className="sm:hidden" /> <span className="text-orange-500">Fresh Creative?</span>
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            <div className="group relative p-6 sm:p-7 rounded-tr-[34px] rounded-bl-[34px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-lime-300 to-lime-100 dark:from-[#131a68] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#f4ff61]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-lime-400 dark:bg-[#f4ff61]/10 border-2 border-lime-500 dark:border-[#f4ff61]/35 shadow-md flex items-center justify-center mb-5 sm:mb-6 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/success.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mb-3">Pengalaman & Integritas</h4>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Berpengalaman lebih dari satu dekade di industri kreatif digital dengan rekam jejak inovasi yang terbukti.
              </p>
            </div>

            <div className="group relative p-6 sm:p-7 rounded-tr-[34px] rounded-bl-[34px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-amber-300 to-amber-100 dark:from-[#131a68] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#ff9900]/30 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-400 dark:bg-[#ff9900]/15 border-2 border-amber-500 dark:border-[#ff9900]/40 shadow-md flex items-center justify-center mb-5 sm:mb-6 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/ai.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mb-3">Teknologi Terkini</h4>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Menggunakan infrastruktur Cloud dan AI tercanggih untuk memastikan hasil terbaik untuk setiap produk kami.
              </p>
            </div>

            <div className="group relative p-6 sm:p-7 rounded-tr-[34px] rounded-bl-[34px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-sky-300 to-sky-100 dark:from-[#131a68] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#5cecff]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-sky-400 dark:bg-[#5cecff]/15 border-2 border-sky-500 dark:border-[#5cecff]/40 shadow-md flex items-center justify-center mb-5 sm:mb-6 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/security.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mb-3">Keamanan Data</h4>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Data kamu kami jaga. File dan informasi akun disimpan aman di cloud, dan hanya orang yang punya akses yang
                bisa melihatnya.
              </p>
            </div>

            <div className="group relative p-6 sm:p-7 rounded-tr-[34px] rounded-bl-[34px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-rose-300 to-rose-100 dark:from-[#1a0d4a] dark:to-[#0d1148] border-2 border-slate-900 dark:border-[#ff61c6]/25 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-rose-400 dark:bg-[#ff61c6]/15 border-2 border-rose-500 dark:border-[#ff61c6]/40 shadow-md flex items-center justify-center mb-5 sm:mb-6 overflow-hidden shrink-0">
                <DotLottieReact
                  src="/lottie/emoji.json"
                  loop
                  autoplay
                  className="w-full h-full p-2 sm:p-3 dark:bg-white/25 dark:rounded-lg"
                />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase mb-3">Fokus pada Ekspresi</h4>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Kami percaya bahwa setiap individu memiliki cerita unik yang layak ditampilkan secara estetik dan ekspresif.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

