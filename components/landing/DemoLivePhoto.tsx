'use client';

import { AnimatedTitle } from "./AnimatedTitle";
import { RoundedCorners } from "./RoundedCorners";

export function DemoLivePhoto() {
  return (
    <section id="demo-livephoto" className="min-h-screen sm:min-h-dvh w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-blue-50 transition-colors duration-500 overflow-hidden">
      <div className="flex size-full flex-col items-center pt-16 pb-4 sm:py-20 px-4 sm:px-0">
        <p className="font-general text-sm sm:text-base uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 sm:mb-4 scroll-mt-[100px] sm:scroll-mt-[120px]" id="demo-ar">
          Coba Demo Interaktif
        </p>

        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3 md:mt-10 md:gap-8">
          <div className="flex flex-col items-center text-center">
            <span className="font-general mb-2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white bg-lime-400 text-sm sm:text-lg font-black text-slate-900 shadow-[1.5px_1.5px_0_0_#0f172a] dark:shadow-[1.5px_1.5px_0_0_#fff]">
              1
            </span>
            <h3 className="font-general text-base font-black uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Scan QR Code
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-blue-50/70 max-w-[200px]">
              Setiap halaman punya QR unik. Gunakan kamera HP.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-general mb-2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white bg-lime-400 text-sm sm:text-lg font-black text-slate-900 shadow-[1.5px_1.5px_0_0_#0f172a] dark:shadow-[1.5px_1.5px_0_0_#fff]">
              2
            </span>
            <h3 className="font-general text-base font-black uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Arahkan Kamera
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-blue-50/70 max-w-[200px]">
              Teknologi image tracking akan mengenali foto di buku.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-general mb-2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white bg-lime-400 text-sm sm:text-lg font-black text-slate-900 shadow-[1.5px_1.5px_0_0_#0f172a] dark:shadow-[1.5px_1.5px_0_0_#fff]">
              3
            </span>
            <h3 className="font-general text-base font-black uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Video Auto-Play
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-blue-50/70 max-w-[200px]">
              Video kenangan muncul melayang (WebAR). Magic!
            </p>
          </div>
        </div>

        <div className="relative mt-16 sm:mt-12 size-full text-center">
          <AnimatedTitle containerClass="relative z-20 -mt-4 sm:mt-5 pointer-events-none !text-black dark:!text-white">
            {"Rasakan sensasi <br /> buku yang bisa bicara"}
          </AnimatedTitle>

          <div className="story-img-container -mt-32 sm:mt-0 md:-mt-6">
            <div className="story-img-mask border-[3px] border-black dark:border-white shadow-none rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
              <div className="story-img-content">
                <video
                  src="/videos/livevideo.webm"
                  preload="auto"
                  className="object-contain object-center story-img-hover h-full w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>
            <RoundedCorners />
          </div>
        </div>

        <div className="relative z-20 -mt-32 sm:mt-4 flex w-full justify-center px-6 pb-6 sm:pb-24">
          <div className="flex w-full max-w-5xl flex-col items-center">
            <p className="font-general max-w-2xl text-center text-[11px] sm:text-base leading-relaxed text-slate-600 dark:text-blue-50/70">
              Teknologi WebAR kami memungkinkan video kenangan muncul melayang di atas kertas.
              Cukup scan QR code dan arahkan kamera ke foto.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="font-general text-[10px] uppercase tracking-widest text-slate-400 dark:text-blue-50/60">
                Powered by
              </span>
              <a
                href="https://livephoto.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all hover:scale-110 active:scale-95"
              >
                <img
                  src="/img/livephotos.svg"
                  alt="LivePhoto"
                  className="h-10 md:h-12 w-auto dark:brightness-0 dark:invert nav-icon-stroke"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
