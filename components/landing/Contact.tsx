'use client';

import { TiLocationArrow } from "react-icons/ti";

interface ImageClipBoxProps {
  src: string;
  alt: string;
  clipClass?: string;
}

function ImageClipBox({ src, alt, clipClass }: ImageClipBoxProps) {
  return (
    <div className={clipClass}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export function Contact() {
  return (
    <section id="contact" className="py-20 min-h-96 w-full px-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-500">
      <div className="relative rounded-[2rem] bg-slate-950 dark:bg-slate-900/50 border border-white/5 py-24 text-blue-50 sm:overflow-hidden transition-colors duration-500">
        <div className="absolute top-0 -left-20 hidden h-full w-72 overflow-hidden sm:block lg:left-20 lg:w-96">
          <ImageClipBox
            src="/img/contact-1.webp"
            alt="Contact bg 1"
            clipClass="abstract-shape-1 shadow-xl overflow-hidden mb-4"
          />
          <ImageClipBox
            src="/img/contact-2.webp"
            alt="Contact bg 2"
            clipClass="abstract-shape-2 shadow-xl overflow-hidden lg:translate-y-20 translate-y-32"
          />
        </div>

        <div className="absolute -top-40 left-20 hidden sm:block w-60 sm:top-1/2 md:right-10 md:left-auto lg:top-20 lg:w-80">
          <ImageClipBox
            src="/img/about.webp"
            alt="About partial"
            clipClass="absolute -z-10 opacity-50 md:scale-125 blur-sm abstract-shape-3"
          />
          <ImageClipBox
            src="/img/entrance.webp"
            alt="Entrance"
            clipClass="abstract-shape-4 shadow-xl overflow-hidden md:scale-110"
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="font-general text-base uppercase md:text-lg mb-4 text-white/60">Ayo Bikin Sejarah</p>
          <p className="special-font font-zentry mt-10 w-full text-5xl leading-[0.9] md:text-[6rem] text-white">
            Ud<b>a</b>h Si<b>a</b>p <br /> Bikin Sej<b>a</b>rah <br /> Angk
            <b>a</b>tanmu?
          </p>
          <a
            href="#pricing"
            className="font-general group relative z-10 mt-10 inline-flex items-center gap-1 cursor-pointer overflow-hidden rounded-full bg-yellow-300 px-7 py-3 text-center text-xs font-black uppercase text-black border border-slate-900 shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
          >
            <TiLocationArrow className="text-lg" />
            Buat Project
          </a>
        </div>
      </div>
      
      <style>{`
        .abstract-shape-1 { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        .abstract-shape-2 { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
        .abstract-shape-3 { border-radius: 73% 27% 51% 49% / 31% 54% 46% 69%; }
        .abstract-shape-4 { border-radius: 35% 65% 31% 69% / 57% 59% 41% 43%; }
      `}</style>
    </section>
  );
}
