'use client';

import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Link from 'next/link';
import { RefreshCcw, Home, AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-6 py-20">
      {/* Background dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Glow blobs - Red/Violet for error state */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
        <img src="/img/logo.png" alt="Fresh Creative" className="w-8 h-8 sm:w-10 sm:h-10" />
      </Link>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
        
        {/* Lottie animation - Using same cat for consistency, but with a different message context */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 mb-2 filter hue-rotate-[300deg]"> {/* Shift colors slightly to look more like 'error' */}
          {mounted && (
            <DotLottieReact
              src="/videos/404cat.lottie"
              loop
              autoplay
            />
          )}
        </div>

        {/* Error badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-400/40 bg-red-400/10 text-red-400 text-xs font-black uppercase tracking-widest">
          <AlertCircle className="w-3 h-3" />
          System Error
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-[0.9] mb-4">
          Oops!<br />
          <span className="text-red-500">Ada Masalah.</span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base font-medium text-slate-400 max-w-sm mx-auto leading-relaxed mb-10">
          Maaf ya, sepertinya ada sedikit kendala teknis di sistem kami. Coba muat ulang halaman atau balik ke beranda.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => reset()}
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-white text-slate-900 font-black text-sm uppercase tracking-wide rounded-full border border-slate-700 shadow-[3px_3px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
          >
            <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Coba Lagi
          </button>
          
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-transparent text-white font-black text-sm uppercase tracking-wide rounded-full border-2 border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
        </div>

        {/* Support info */}
        <div className="mt-16 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-slate-700">
            <div className="h-px w-12 bg-slate-700" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Butuh Bantuan?</span>
            <div className="h-px w-12 bg-slate-700" />
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Jika masalah berlanjut, hubungi tim support Fresh Creative.</p>
        </div>
      </div>
    </div>
  );
}
