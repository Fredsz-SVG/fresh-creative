'use client';

import { AnimatedTitle } from "./AnimatedTitle";
import { RoundedCorners } from "./RoundedCorners";

export function DemoLivePhoto() {
  return (
    <section id="demo-livephoto" className="min-h-dvh w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-blue-50 transition-colors duration-500">
      <div className="flex size-full flex-col items-center py-10 pb-24">
        <p className="font-general text-base uppercase md:text-lg text-slate-500 dark:text-slate-400 mb-4" id="demo-ar">
          Coba Demo Interaktif
        </p>

        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 md:mt-10 md:gap-8">
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="font-zentry mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 dark:border-blue-50/50 bg-slate-50 dark:bg-blue-50/5 text-xl font-black text-slate-900 dark:text-blue-50">
              1
            </span>
            <h3 className="font-general text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Scan QR Code
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-blue-50/80">
              Setiap halaman punya QR unik. Gunakan kamera HP atau aplikasi scanner.
            </p>
          </div>
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="font-zentry mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 dark:border-blue-50/50 bg-slate-50 dark:bg-blue-50/5 text-xl font-black text-slate-900 dark:text-blue-50">
              2
            </span>
            <h3 className="font-general text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Arahkan ke Foto
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-blue-50/80">
              Teknologi image tracking akan mengenali foto di buku fisik.
            </p>
          </div>
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="font-zentry mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 dark:border-blue-50/50 bg-slate-50 dark:bg-blue-50/5 text-xl font-black text-slate-900 dark:text-blue-50">
              3
            </span>
            <h3 className="font-general text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-blue-50">
              Video Auto-Play
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-blue-50/80">
              Video kenangan muncul melayang di atas kertas (WebAR). Magic!
            </p>
          </div>
        </div>

        <div className="relative mt-12 size-full md:mt-16">
          <AnimatedTitle containerClass="mt-5 pointer-events-none relative z-10 !text-black dark:!text-white">
            {"Rasakan sensasi <br /> buku yang bisa bicara"}
          </AnimatedTitle>

          <div className="story-img-container -mt-4 md:-mt-6">
            <div className="story-img-mask border-2 border-slate-900 dark:border-slate-800">
              <div className="story-img-content">
                <video
                  src="/videos/livevideo.webm"
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

        <div className="relative z-20 mt-2 flex w-full justify-center px-4 pb-12 md:-mt-4 md:justify-center md:px-0 md:pb-16">
          <div className="flex w-full max-w-5xl flex-col items-center md:items-center">
            <p className="font-general mt-3 w-full max-w-4xl text-center text-sm leading-relaxed text-slate-600 dark:text-violet-50 md:text-base">
              Teknologi WebAR kami memungkinkan video kenangan muncul melayang di atas kertas.
              <br />
              Cukup scan QR code di halaman buku dan arahkan kamera ke foto.
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
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
