'use client';

import { TiLocationArrow } from "react-icons/ti";



export function Contact() {
  return (
    <section id="contact" className="py-20 min-h-96 w-full px-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-500">
      <div className="relative rounded-[2rem] bg-slate-950 dark:bg-slate-900/50 border border-white/5 py-24 text-blue-50 sm:overflow-hidden transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-20">
          {/* Phone Frame Mockup */}
          <div className="absolute 
            top-10 md:top-1/2 
            left-1/2 md:left-10 lg:left-20 xl:left-32
            -translate-x-1/2 md:-translate-x-0 md:-translate-y-1/2 
            w-[220px] h-[440px] md:w-[200px] md:h-[400px] lg:w-[240px] lg:h-[480px] 
            opacity-30 md:opacity-100 transition-all duration-700">
            <div className="relative mx-auto border-black bg-black border-[6px] md:border-[10px] lg:border-[12px] rounded-[1.8rem] md:rounded-[2rem] lg:rounded-[2.5rem] h-full w-full shadow-[10px_10px_30px_rgba(0,0,0,0.5)]">
              {/* Notch */}
              <div className="w-[60px] md:w-[70px] lg:w-[80px] h-[10px] md:h-[12px] lg:h-[14px] bg-black top-0 left-1/2 -translate-x-1/2 rounded-b-[0.6rem] md:rounded-b-[0.8rem] absolute z-20"></div>
              {/* Buttons */}
              <div className="h-[25px] md:h-[30px] lg:h-[35px] w-[2px] bg-black absolute -left-[8px] md:-left-[12px] lg:-left-[14px] top-[70px] md:top-[85px] lg:top-[100px] rounded-l-md"></div>
              <div className="h-[25px] md:h-[30px] lg:h-[35px] w-[2px] bg-black absolute -left-[8px] md:-left-[12px] lg:-left-[14px] top-[100px] md:top-[125px] lg:top-[150px] rounded-l-md"></div>
              <div className="h-[35px] md:h-[40px] lg:h-[45px] w-[2px] bg-black absolute -right-[8px] md:-right-[12px] lg:-right-[14px] top-[80px] md:top-[100px] lg:top-[120px] rounded-r-md"></div>
              
              {/* Screen Content */}
              <div className="relative rounded-[1.2rem] md:rounded-[1.6rem] lg:rounded-[1.9rem] overflow-hidden w-full h-full bg-slate-950 flex items-center justify-center">
                <video
                  src="/videos/freshrobot.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Shiny Screen Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-none"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center text-center md:flex-row md:justify-end md:text-left relative z-10 px-4 md:pl-[300px] md:pr-10 lg:pl-[400px] lg:pr-20 xl:pl-[500px] xl:pr-32 pt-[420px] md:pt-0">
          <div className="md:max-w-md lg:max-w-xl">
            <p className="font-general text-[8px] sm:text-xs uppercase tracking-[0.2em] text-lime-400 font-black mb-3">
              Ayo Bikin Sejarah
            </p>
            <h2 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
              Udah Siap <br className="hidden lg:block" /><span className="text-yellow-300">Bikin Sejarah?</span>
            </h2>
            <p className="mt-4 sm:mt-6 text-[11px] sm:text-base font-medium text-white/60 uppercase tracking-wider">
              Investasi kenangan untuk selamanya. <br className="hidden sm:block" /> Abadikan setiap momen berharga dan buat kenanganmu jadi nyata.
            </p>
            <a
              href="#pricing"
              className="font-general group relative z-10 mt-10 inline-flex items-center gap-1 cursor-pointer overflow-hidden rounded-full bg-yellow-300 px-7 py-3 text-center text-xs font-black uppercase text-black border border-slate-200 shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:shadow-[2px_2px_0_0_#a3e635] dark:hover:shadow-[3px_3px_0_0_#a3e635] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
            >
              <TiLocationArrow className="text-lg" />
              Buat Project
            </a>
          </div>
        </div>
      </div>
      

    </section>
  );
}
