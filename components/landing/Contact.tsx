'use client';

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
            clipClass="contact-clip-path-1"
          />
          <ImageClipBox
            src="/img/contact-2.webp"
            alt="Contact bg 2"
            clipClass="contact-clip-path-2 lg:translate-y-40 translate-y-60"
          />
        </div>

        <div className="absolute -top-40 left-20 w-60 sm:top-1/2 md:right-10 md:left-auto lg:top-20 lg:w-80">
          <ImageClipBox
            src="/img/swordman-partial.webp"
            alt="Swordman partial"
            clipClass="absolute md:scale-125"
          />
          <ImageClipBox
            src="/img/swordman.webp"
            alt="Swordman"
            clipClass="sword-man-clip-path md:scale-125"
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
            className="font-general group relative z-10 mt-10 w-fit cursor-pointer overflow-hidden rounded-full bg-lime-400 px-10 py-4 text-center text-sm font-black uppercase text-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-lime-400/20"
          >
            Buat Project
          </a>
        </div>
      </div>
    </section>
  );
}
