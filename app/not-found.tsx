'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TiLocationArrow } from 'react-icons/ti';
import { Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-6 py-20">
      {/* Background dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Glow blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
        <img src="/img/logo.png" alt="Fresh Creative" className="w-8 h-8 sm:w-10 sm:h-10 animate-logo-pulse" />
      </Link>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">

        {/* Lottie animation */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 mb-2">
          {mounted && (
            <DotLottieReact
              src="/videos/404cat.lottie"
              loop
              autoplay
            />
          )}
        </div>

        {/* 404 badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lime-400/40 bg-lime-400/10 text-lime-400 text-xs font-black uppercase tracking-widest">
          Error 404
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-[0.9] mb-4">
          Halaman<br />
          <span className="text-lime-400">Tidak</span> Ada.
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base font-medium text-slate-400 max-w-sm mx-auto leading-relaxed mb-10">
          Kayaknya halaman yang kamu cari udah pindah, dihapus, atau emang nggak pernah ada. Balik ke beranda yuk!
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-lime-400 text-slate-900 font-black text-sm uppercase tracking-wide rounded-full border border-slate-700 shadow-[3px_3px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-transparent text-white font-black text-sm uppercase tracking-wide rounded-full border-2 border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Kembali
          </button>
        </div>

        {/* Decorative divider */}
        <div className="mt-16 flex items-center gap-4 text-slate-700">
          <div className="h-px w-16 bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Fresh Creative Indonesia</span>
          <div className="h-px w-16 bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
