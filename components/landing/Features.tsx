'use client';

import { type PropsWithChildren } from "react";

function BentoCardWrap({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`group relative transition-all duration-300 border border-slate-900 dark:border-slate-800 shadow-[4px_4px_0_0_#334155] md:shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#334155] dark:hover-shadow-neo-glow overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-slate-800/80 ${className}`}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  media: "video" | "image";
  src: string;
  title: React.ReactNode;
  description?: string;
}

function BentoCard({ media, src, title, description }: BentoCardProps) {
  return (
    <article className="relative size-full group">
      {/* Media layer */}
      {media === "video" ? (
        <video
          src={src}
          preload="metadata"
          loop
          muted
          autoPlay
          playsInline
          className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 size-full overflow-hidden">
          <img
            src={src}
            alt=""
            className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const next = e.currentTarget.nextElementSibling as HTMLElement;
              if (next) next.classList.remove("hidden");
            }}
          />
          {/* gradient fallback */}
          <div
            className="hidden size-full"
            aria-hidden
            style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #0d1b2a 100%)" }}
          />
        </div>
      )}

      {/* Gradient overlay — richer, lebih gelap di bawah */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(5,4,15,0.92) 0%, rgba(5,4,15,0.45) 45%, rgba(5,4,15,0.05) 100%)",
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 z-10 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-20 flex size-full flex-col justify-end p-6 md:p-8">
        <div>
          <h2 
            className="font-zentry text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-tight drop-shadow-lg leading-none"
            style={{ WebkitTextStroke: '1px black' } as any}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 md:mt-3 max-w-sm font-general text-sm md:text-base font-bold text-slate-200 drop-shadow-md leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function Features() {
  return (
    <section
      className="pb-10 bg-slate-100 dark:bg-slate-950 transition-colors duration-500"
    >
      <div className="container mx-auto px-3 md:px-10">

        <div className="px-3 md:px-5 py-10 md:py-16 text-center sm:text-left" id="features">
          <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3">
            Our Services
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Bisa Ngapain <br className="hidden sm:block" /><span className="text-violet-600 dark:text-violet-400">Aja Sih?</span>
          </h2>
        </div>

        {/* ── Hero card: Yearbook ── */}
        <BentoCardWrap className="relative mb-5 md:mb-7 h-80 md:h-[65vh] w-full">
          <BentoCard
            media="image"
            src="/img/yearbooks.png"
            title={<>YEARBOOK</>}
            description="What can we do?"
          />
        </BentoCardWrap>

        {/* ── Bento grid ── */}
        <div id="nexus" className="grid h-auto md:h-[45vh] grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1 gap-5 md:gap-7">

          {/* Video & Foto */}
          <BentoCardWrap className="h-80 md:h-full">
            <BentoCard
              media="image"
              src="/img/sesifoto.jpg"
              title={<>Video &amp; Fotografi</>}
              description="Sesi pemotretan dan video dengan tim kreatif berpengalaman."
            />
          </BentoCardWrap>

          {/* Event Organizer */}
          <BentoCardWrap className="h-80 md:h-full">
            <BentoCard
              media="image"
              src="/img/organizer.jpg"
              title={<>Event Organizer</>}
              description="Kami urus semua acara yearbook-mu, dari konsep sampai eksekusi."
            />
          </BentoCardWrap>

        </div>
      </div>
    </section>
  );
}