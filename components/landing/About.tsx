'use client';

import { motion } from "framer-motion";
import { Telescope, Flag, Award, Cpu, Smile, Shirt, Wand2, MousePointer2, BadgeCheck } from "lucide-react";

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
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime-200 dark:bg-lime-900/50 text-lime-700 dark:text-lime-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-6 sm:mb-8 border-2 border-lime-600/20">
            <Award size={14} />
            Established Since 2013
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
            className="relative p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-950 dark:border-slate-800 shadow-[8px_8px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
              <Telescope className="text-orange-500" size={28} />
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
            className="relative p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-950 dark:border-slate-800 shadow-[8px_8px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-xl bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-6">
              <Flag className="text-lime-500" size={28} />
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
            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-6">
                <Shirt className="text-violet-500" size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">AI Fashion & OOTD</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Siswa dapat mengekspresikan gaya personal mereka tanpa batas melalui virtual try-on dan modifikasi busana digital.
              </p>
            </div>

            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-6">
                <Wand2 className="text-pink-500" size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Thematic Transformation</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Mengubah foto individu atau grup menjadi karya seni bertema khusus secara instan (contoh: Tema Budaya Nusantara, Sci-Fi, Cyberpunk).
              </p>
            </div>

            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-6">
                <MousePointer2 className="text-sky-500" size={24} />
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
            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-6">
                <BadgeCheck className="text-lime-500" size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Pengalaman & Integritas</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Berpengalaman lebih dari satu dekade di industri kreatif digital dengan rekam jejak inovasi yang terbukti.
              </p>
            </div>

            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                <Cpu className="text-orange-500" size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-4">Teknologi Terkini</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Menggunakan infrastruktur Cloud dan AI tercanggih untuk memastikan hasil terbaik untuk setiap produk kami.
              </p>
            </div>

            <div className="group p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
                <Smile className="text-indigo-500" size={24} />
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

