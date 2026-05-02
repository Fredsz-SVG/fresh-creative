'use client';

import { type PropsWithChildren, useState, useEffect } from "react";
import { Images, X, ChevronRight, ChevronLeft } from "lucide-react";

function BentoCardWrap({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`group relative transition-all duration-300 border border-slate-900 dark:border-[#5cecff]/20 shadow-[4px_4px_0_0_#334155] md:shadow-[4px_4px_0_0_#334155] dark:shadow-neo-glow hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#334155] dark:hover-shadow-neo-glow overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#131a68]/70 ${className}`}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  media: "video" | "image";
  src: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}

function BentoCard({ media, src, title, description, action }: BentoCardProps) {
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
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
          {action && (
            <div className="shrink-0 pointer-events-auto z-30">
              {action}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function Features() {
  const [showGallery, setShowGallery] = useState(false);
  
  // Nanti array ini bisa ditambah dengan URL foto-foto lainnya
  const galleryImages = [
    "/img/yearbooks.png",
    "/img/yearbook-1.png",
    "/img/yearbook-2.png",
    "/img/yearbook-3.png",
    "/img/sesifoto.webp",
    "/img/organizer.webp",
    "/img/about.webp",
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mencegah scroll pada halaman utama saat popup terbuka
  useEffect(() => {
    if (showGallery) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showGallery]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <section
      id="features"
      className="pb-10 bg-slate-100 dark:bg-[#0a0c37] transition-colors duration-500"
    >
      <div className="container mx-auto px-3 md:px-10">

        <div className="px-3 md:px-5 py-10 md:py-16 text-center sm:text-left">
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
            action={
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setShowGallery(true);
                }}
                className="flex items-center gap-2 bg-black/60 hover:bg-black/90 backdrop-blur-md text-white px-5 py-3 rounded-full font-bold transition-all duration-300 border border-white/20 hover:scale-105 shadow-xl"
              >
                <Images size={20} />
                Lihat Gallery
              </button>
            }
          />
        </BentoCardWrap>

        {/* ── Bento grid ── */}
        <div id="nexus" className="grid h-auto md:h-[45vh] grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1 gap-5 md:gap-7">

          {/* Video & Foto */}
          <BentoCardWrap className="h-80 md:h-full">
            <BentoCard
              media="image"
              src="/img/sesifoto.webp"
              title={<>Video &amp; Fotografi</>}
              description="Sesi pemotretan dan video dengan tim kreatif berpengalaman."
            />
          </BentoCardWrap>

          {/* Event Organizer */}
          <BentoCardWrap className="h-80 md:h-full">
            <BentoCard
              media="image"
              src="/img/organizer.webp"
              title={<>Event Organizer</>}
              description="Kami urus semua acara yearbook-mu, dari konsep sampai eksekusi, seperti prom night, wisuda, perpisahan, pentas seni, dan lainnya."
            />
          </BentoCardWrap>

        </div>
      </div>

      {/* Gallery Popup Overlay */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <button 
            onClick={() => setShowGallery(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50 backdrop-blur-sm"
          >
            <X size={28} />
          </button>

          <div className="relative w-full max-w-7xl h-[85vh] flex items-center justify-center">
            {galleryImages.length > 1 && (
              <button 
                onClick={handlePrev}
                className="absolute left-2 md:left-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all z-10 hover:scale-110 backdrop-blur-sm"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <img 
              src={galleryImages[currentIndex]} 
              alt={`Gallery Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-opacity duration-300"
            />

            {galleryImages.length > 1 && (
              <button 
                onClick={handleNext}
                className="absolute right-2 md:right-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all z-10 hover:scale-110 backdrop-blur-sm"
              >
                <ChevronRight size={32} />
              </button>
            )}
            
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-5 py-2 rounded-full text-white text-sm font-bold tracking-widest border border-white/10">
                {currentIndex + 1} / {galleryImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}