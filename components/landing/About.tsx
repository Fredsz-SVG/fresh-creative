'use client';

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function About() {
  return (
    <section
      id="about"
      className="relative w-full bg-slate-100 dark:bg-slate-950 py-16 sm:py-20 md:py-24 lg:py-32 transition-colors duration-500 overflow-hidden"
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
          <div className="inline-grid grid-cols-[auto_1fr] items-center mb-10 sm:mb-14 border-2 border-slate-950 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5">
            <div className="bg-slate-950 dark:bg-slate-800 p-2.5 sm:p-3 border-r-2 border-slate-950 dark:border-slate-700 text-lime-400">
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
            className="relative p-8 sm:p-10 rounded-tl-[40px] rounded-br-[40px] rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-sky-300 to-sky-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-sky-400 dark:bg-sky-500/20 border-2 border-sky-500 dark:border-sky-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
              <DotLottieReact src="/lottie/community.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
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
            className="relative p-8 sm:p-10 rounded-tl-[40px] rounded-br-[40px] rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-emerald-300 to-emerald-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-emerald-400 dark:bg-emerald-500/20 border-2 border-emerald-500 dark:border-emerald-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
              <DotLottieReact src="/lottie/roket.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
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
              Produk Unggulan: <span className="text-lime-500 underline decoration-4 underline-offset-8">Smart Digital Yearbook</span>
            </h2>
            <p className="mt-6 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">
              Developed Since Q4 2025 • Powered by AILabs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-pink-300 to-pink-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-pink-400 dark:bg-pink-500/20 border-2 border-pink-500 dark:border-pink-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/shirt.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">AI Fashion & OOTD</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Siswa dapat mengekspresikan gaya personal mereka tanpa batas melalui virtual try-on dan modifikasi busana digital.
              </p>
            </div>

            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-fuchsia-300 to-fuchsia-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-fuchsia-400 dark:bg-fuchsia-500/20 border-2 border-fuchsia-500 dark:border-fuchsia-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/sparkle.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Thematic Transformation</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Mengubah foto individu atau grup menjadi karya seni bertema khusus secara instan (contoh: Tema Budaya Nusantara, Sci-Fi, Cyberpunk).
              </p>
            </div>

            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-violet-300 to-violet-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-violet-400 dark:bg-violet-500/20 border-2 border-violet-500 dark:border-violet-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/image.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Interactive Memories</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Bukan sekadar foto statis, album ini merupakan ekosistem digital yang dinamis dan mudah diakses kapan saja.
              </p>
            </div>
          </div>
        </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-lime-300 to-lime-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-lime-400 dark:bg-lime-500/20 border-2 border-lime-500 dark:border-lime-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/success.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Pengalaman & Integritas</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Berpengalaman lebih dari satu dekade di industri kreatif digital dengan rekam jejak inovasi yang terbukti.
              </p>
            </div>

            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-amber-300 to-amber-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-amber-400 dark:bg-amber-500/20 border-2 border-amber-500 dark:border-amber-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/ai.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Teknologi Terkini</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Menggunakan infrastruktur Cloud dan AI tercanggih untuk memastikan hasil terbaik untuk setiap produk kami.
              </p>
            </div>

            <div className="group relative p-8 sm:p-10 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-xl rounded-br-xl bg-gradient-to-bl from-rose-300 to-rose-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 isolation z-10 hover:z-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-rose-400 dark:bg-rose-500/20 border-2 border-rose-500 dark:border-rose-400/50 shadow-md flex items-center justify-center mb-6 sm:mb-8 overflow-hidden shrink-0">
                <DotLottieReact src="/lottie/emoji.json" loop autoplay className="w-full h-full p-2 sm:p-3" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Fokus pada Ekspresi</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Kami percaya bahwa setiap individu memiliki cerita unik yang layak ditampilkan secara estetik dan ekspresif.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

