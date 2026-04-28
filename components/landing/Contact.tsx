'use client';

import { TiLocationArrow } from "react-icons/ti";

export function Contact() {
  return (
    <section id="contact" className="py-20 min-h-96 w-full px-4 sm:px-10 bg-slate-100 dark:bg-[#0a0c37] transition-colors duration-500 overflow-hidden">
      <div className="relative rounded-[2.5rem] bg-orange-400 dark:bg-[#0d1148] border-4 border-slate-950 dark:border-[#ff61c6]/35 py-24 text-white sm:overflow-hidden transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 dark:shadow-neo-glow shadow-[6px_6px_0_0_#334155]">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-20 relative z-10 px-6 sm:px-12">
          {/* Phone Frame Mockup - Now Relative to Flex */}
          <div className="relative w-[220px] h-[440px] md:w-[240px] md:h-[480px] shrink-0 transition-all duration-700">
            <div className="relative border-black bg-black border-[8px] md:border-[12px] rounded-[2.2rem] md:rounded-[2.5rem] h-full w-full shadow-2xl">
              {/* Notch */}
              <div className="w-[60px] md:w-[80px] h-[10px] md:h-[14px] bg-black top-0 left-1/2 -translate-x-1/2 rounded-b-[0.6rem] md:rounded-b-[0.8rem] absolute z-20"></div>
              {/* Buttons */}
              <div className="h-[25px] md:h-[35px] w-[2px] bg-black absolute -left-[8px] md:-left-[14px] top-[70px] md:top-[100px] rounded-l-md"></div>
              <div className="h-[35px] md:h-[45px] w-[2px] bg-black absolute -right-[8px] md:-right-[14px] top-[80px] md:top-[120px] rounded-r-md"></div>
              
              {/* Screen Content */}
              <div className="relative rounded-[1.4rem] md:rounded-[1.9rem] overflow-hidden w-full h-full bg-slate-950 flex items-center justify-center">
                <video
                  src="/videos/freshrobot.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-none"></div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="max-w-md lg:max-w-xl text-center md:text-left">
            <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.25em] text-slate-950 dark:text-lime-400 font-black mb-4">
              Ayo Bikin Sejarah
            </p>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight uppercase leading-[1.05]">
              Udah Siap <br className="hidden lg:block" /><span className="text-white dark:text-yellow-300">Bikin Sejarah?</span>
            </h2>
            <p className="mt-6 text-[12px] sm:text-base font-medium text-slate-900/80 dark:text-white/60 uppercase tracking-wider leading-relaxed">
              Investasi kenangan untuk selamanya. <br className="hidden sm:block" /> Abadikan setiap momen berharga dan buat kenanganmu jadi nyata.
            </p>
            <a
              href="#pricing"
              className="font-general group relative z-10 mt-10 inline-flex items-center gap-2 cursor-pointer overflow-hidden rounded-full bg-yellow-300 px-8 py-3.5 text-center text-xs font-black uppercase text-black border-2 border-slate-950 shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] transition-all"
            >
              <TiLocationArrow className="text-xl" />
              Buat Project
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
