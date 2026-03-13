'use client';

import { VIDEO_LINKS } from "./constants";
import { type PropsWithChildren } from "react";

// ─── Font import (paste di <head> atau globals.css) ───────────────────────
// @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Syne:wght@700;800&display=swap');

function BentoCardWrap({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`bento-hover ${className}`}>{children}</div>;
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
      <div className="relative z-20 flex size-full flex-col justify-end p-6 md:p-7">
        {/* Title + description di bawah */}
        <div>
          <h2
            className="bento-title special-font card-title-font"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontWeight: 400,
              fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)",
              lineHeight: 1.1,
              letterSpacing: "0.06em",
              color: "#fff",
              textShadow: "0 4px 32px rgba(0,0,0,0.7)",
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              className="mt-4 max-w-xs"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
                lineHeight: 1.75,
                color: "rgba(220,230,255,0.75)",
                letterSpacing: "0.015em",
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Subtle border glow on hover */}
      <div
        className="absolute inset-0 z-20 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
      />
    </article>
  );
}

export function Features() {
  return (
    <section
      className="pb-10"
      style={{ background: "linear-gradient(180deg, #05040f 0%, #080613 100%)" }}
    >
      <div className="container mx-auto px-3 md:px-10">

        {/* Section header — hanya headline, tanpa eyebrow & subtext */}
        <div className="px-5 py-16" id="features">
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              lineHeight: 1.05,
              color: "#fff",
              letterSpacing: "-0.01em",
              maxWidth: "22ch",
            }}
          >
            Satu ekosistem,
            <br />
            <span style={{ color: "rgba(167,139,250,0.85)" }}>semua kenangan.</span>
          </h1>
        </div>

        {/* ── Hero card: Yearbook ── */}
        <BentoCardWrap className="border-hsla relative mb-7 h-96 w-full overflow-hidden rounded-2xl md:h-[65vh]">
          <BentoCard
            media="image"
            src="/img/yearbooks.png"
            title={<>YEARBOOK</>}
            description="Digital Swipe Carousel, Digital Flipbook, serta Cetak Buku Fisik."
          />
        </BentoCardWrap>

        {/* ── Bento grid ── */}
        <div id="nexus" className="grid h-auto md:h-[90vh] grid-cols-2 grid-rows-3 md:grid-rows-2 gap-5 md:gap-7">

          {/* Web AR LivePhoto — tall left */}
          <BentoCardWrap className="bento-tilt_1 row-span-1 md:col-span-1 md:row-span-2 overflow-hidden rounded-2xl">
            <BentoCard
              media="image"
              src="/img/livehand.png"
              title={<>Web AR LivePhoto</>}
              description="Scan QR, arahkan ke foto—video kenangan muncul melayang di atas buku."
            />
          </BentoCardWrap>

          {/* Video & Foto — top right */}
          <BentoCardWrap className="bento-tilt_1 row-span-1 md:col-span-1 overflow-hidden rounded-2xl">
            <BentoCard
              media="image"
              src="/img/sesifoto.jpg"
              title={<>Video &amp; Fotografi</>}
              description="Sesi pemotretan dan video dengan tim kreatif berpengalaman."
            />
          </BentoCardWrap>

          {/* Event Organizer — bottom right */}
          <BentoCardWrap className="bento-tilt_1 md:col-span-1 overflow-hidden rounded-2xl">
            <BentoCard
              media="image"
              src="/img/organizer.jpg"
              title={<>Event Organizer</>}
              description="Kami urus semua acara yearbook-mu, dari konsep sampai eksekusi."
            />
          </BentoCardWrap>

        </div>
      </div>

      {/* Global style (inject ke globals.css atau <style jsx global>) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Bebas+Neue&display=swap');

        .card-title-font {
          font-family: 'Bebas Neue', sans-serif !important;
          letter-spacing: 0.06em !important;
        }
      `}</style>
    </section>
  );
}