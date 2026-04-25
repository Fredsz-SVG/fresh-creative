'use client';

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useState, useContext, useCallback, useRef } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { Button } from "./Button";
import { VIDEO_LINKS } from "./constants";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Agar GSAP mengabaikan efek naik-turunnya address bar di mobile
if (typeof window !== "undefined") {
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const LOADER_TIMEOUT_MS = 4000;

// ─── Animated Counter ────────────────────────────────────────────────────────

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
  formatFn?: (n: number) => string;
}

function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
  formatFn,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  const display = formatFn ? formatFn(count) : `${count}`;
  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

// Format: selalu tampilkan dalam K (0K → 100K)
// Bug fix: sebelumnya n < 1000 tampil mentah (misal "43"), lalu lompat ke "1K"
const formatToK = (n: number) => `${Math.floor(n / 1000)}`;

// ─── Responsive heading margin top ───────────────────────────────────────────

const HEADING_CLASSES = cn(
  "mt-28 px-8 transition-all duration-500 sm:mt-16 sm:px-20",
  // Mobile portrait — berbagai tinggi layar
  "[@media(max-width:767px)_and_(max-height:650px)]:!mt-[10rem]",
  "[@media(max-width:767px)_and_(min-height:651px)]:!mt-[13rem]",
  "[@media(max-width:767px)_and_(min-height:700px)]:!mt-[16rem]",
  "[@media(max-width:767px)_and_(min-height:740px)]:!mt-[19rem]",
  "[@media(max-width:767px)_and_(min-height:780px)]:!mt-[21rem]",
  "[@media(max-width:767px)_and_(min-height:820px)]:!mt-[23.5rem]",
  "[@media(max-width:767px)_and_(min-height:860px)]:!mt-[25rem]",
  // Tablet & desktop breakpoints
  "[@media(width:1024px)_and_(height:600px)]:!mt-36",
  "[@media(min-width:768px)_and_(min-height:700px)]:mt-28",
  "[@media(min-width:768px)_and_(min-height:800px)]:mt-32 xl:mt-32",
  "[@media(width:1280px)_and_(height:800px)]:!mt-48",
  "[@media(min-width:768px)_and_(min-height:1000px)]:!mt-[28rem]",
  "[@media(min-width:768px)_and_(min-height:1100px)]:!mt-[32rem]",
  "[@media(min-width:768px)_and_(min-height:1200px)]:!mt-[36rem]",
  "[@media(min-width:768px)_and_(min-height:1300px)]:!mt-[40rem]"
);

// ─── GSAP clip-path configs ───────────────────────────────────────────────────

const CLIP_FULL = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

const DESKTOP_ANIM = {
  from: { clipPath: CLIP_FULL, borderRadius: "0 0 0 0" },
  to: {
    clipPath: "polygon(14% 0%, 72% 0%, 90% 90%, 0% 100%)",
    borderRadius: "0 0 40% 10%",
  },
  scrollTrigger: {
    start: "center center",
    end: "bottom center",
    scrub: true,
  },
} as const;

const MOBILE_ANIM = {
  from: { clipPath: CLIP_FULL, borderRadius: "0 0 0 0" },
  to: {
    clipPath: "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)",
    borderRadius: "0 0 5% 5%",
  },
  scrollTrigger: {
    start: "top top",
    end: "bottom center",
    scrub: 1, // Slight delay — smoother feel on mobile
  },
} as const;

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Hero() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasMounted, setHasMounted] = useState(false);
  const theme = useContext(ThemeContext);

  // ── Clock & mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    setHasMounted(true);
    const id = setInterval(() => setCurrentTime(new Date()), 500);
    return () => clearInterval(id);
  }, []);

  // ── Loader ─────────────────────────────────────────────────────────────────
  const hideLoader = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    const t = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hideLoader]);

  // ── GSAP ScrollTrigger ─────────────────────────────────────────────────────
  // Bug fix #1: Guard clause — jangan setup animasi saat masih loading.
  //   Dulu: animasi dibuat 2x (saat loading=true & loading=false), ScrollTrigger.refresh()
  //   dipanggil di useEffect([]) yang jalan sebelum animasi terdaftar → mobile scrub tidak terpicu.
  // Bug fix #2: ScrollTrigger.refresh() sekarang dipanggil di dalam useGSAP via rAF,
  //   sehingga dijamin jalan SETELAH animasi terdaftar.
  useGSAP(() => {
    if (isLoading) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(min-width: 768px)",
        isMobile: "(max-width: 767px)",
      },
      (ctx) => {
        const conditions = ctx.conditions ?? {};
        const cfg = conditions["isDesktop"] ? DESKTOP_ANIM : MOBILE_ANIM;

        gsap.fromTo("#video-frame", cfg.from, {
          ...cfg.to,
          ease: "none",
          scrollTrigger: {
            trigger: "#video-frame",
            invalidateOnRefresh: true,
            ...cfg.scrollTrigger,
          },
        });
      }
    );

    // Refresh setelah animasi terdaftar — gunakan rAF agar DOM sudah settle
    const rafId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(rafId);
      mm.revert();
    };
  }, [isLoading]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const isDark = theme?.isDark ?? false;

  const clockHH = hasMounted
    ? currentTime.getHours().toString().padStart(2, "0")
    : "00";
  const clockMM = hasMounted
    ? currentTime.getMinutes().toString().padStart(2, "0")
    : "00";
  const colonVisible = hasMounted && currentTime.getMilliseconds() < 500;

  return (
    <section
      id="hero"
      className="relative h-[100svh] w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-500"
    >
      {/* ── Loader overlay ── */}
      {isLoading && (
        <div className="flex-center absolute inset-0 z-[100] bg-white dark:bg-slate-950 transition-colors duration-500">
          <img
            src="/img/logo.png"
            alt="Loading…"
            className="w-24 sm:w-32 animate-logo-pulse !opacity-100"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      )}

      {/* ── Video frame (clipped by GSAP on scroll) ── */}
      <div
        id="video-frame"
        className="relative z-10 h-[100svh] w-full overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-500 will-change-[clip-path,border-radius] transform-gpu"
      >
        {/* Light-mode video */}
        <video
          src={VIDEO_LINKS.hero1}
          preload="auto"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full object-cover object-[59%] lg:object-center transition-opacity duration-1000",
            isDark ? "opacity-0" : "opacity-100"
          )}
          // Bug fix #3: Hanya satu video yang perlu trigger hideLoader (yang pertama selesai load).
          //   Dua onLoadedData sebelumnya bisa panggil hideLoader 2x.
          onLoadedData={hideLoader}
          onError={hideLoader}
        />
        {/* Dark-mode video */}
        <video
          src={VIDEO_LINKS.hero2}
          preload="auto"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className={cn(
            "absolute inset-0 size-full object-cover object-[59%] lg:object-center transition-opacity duration-1000",
            isDark ? "opacity-100" : "opacity-0"
          )}
        />

        {/* ── Foreground content ── */}
        <div className="absolute inset-0 z-40 flex flex-col justify-between pt-6 pb-12 sm:py-10 sm:pb-10 md:pb-12 lg:pb-14 xl:pb-16">

          {/* Clock widget */}
          <div
            className={cn(
              "absolute top-28 left-12 z-50 pointer-events-none flex items-center justify-center transition-all duration-500",
              "sm:top-28 [@media(min-width:1300px)]:!top-16 sm:left-1/2 sm:-translate-x-1/2",
              "[@media(min-height:700px)_and_(max-width:499px)]:top-32",
              "[@media(min-height:700px)_and_(max-width:389px)]:left-8",
              "[@media(min-height:700px)_and_(min-width:390px)_and_(max-width:499px)]:left-14",
              "[@media(min-height:700px)_and_(min-width:500px)]:top-32",
              "[@media(min-height:700px)_and_(min-width:500px)_and_(max-width:767px)]:left-40",
              "[@media(min-height:800px)_and_(max-height:819px)_and_(max-width:389px)]:!left-6",
              "[@media(min-height:800px)_and_(max-height:819px)_and_(min-width:390px)_and_(max-width:499px)]:!left-12",
              "[@media(min-height:820px)_and_(max-width:499px)]:!top-40",
              "[@media(min-height:820px)_and_(max-width:389px)]:!left-8",
              "[@media(min-height:820px)_and_(min-width:390px)_and_(max-width:499px)]:!left-10",
              "[@media(min-width:768px)_and_(max-width:1050px)_and_(min-height:1000px)]:!left-[35%]",
              "[@media(max-height:650px)]:top-32",
              "[@media(width:1024px)_and_(height:600px)]:!top-24",
              "[@media(min-height:800px)]:top-36",
              "[@media(width:1280px)_and_(height:800px)]:!top-28",
              "[@media(min-width:1300px)_and_(min-height:800px)]:!top-28",
              "[@media(min-height:1000px)]:!top-[10rem]",
              "[@media(min-height:1100px)]:!top-[11rem]",
              "[@media(min-height:1200px)]:!top-[12rem]",
              "[@media(min-height:1300px)]:!top-[13rem]"
            )}
          >
            <img
              src="/img/JAM.png"
              alt=""
              aria-hidden="true"
              className={cn(
                "w-28 h-auto object-contain opacity-90 drop-shadow-2xl transition-all duration-500",
                "sm:w-24 md:w-24 lg:w-28",
                "[@media(max-height:650px)]:!w-20",
                "[@media(min-height:700px)_and_(max-height:799px)]:!w-24",
                "[@media(min-height:800px)_and_(max-height:999px)]:!w-28",
                "[@media(min-height:1000px)_and_(max-width:1023px)]:!w-44",
                "[@media(min-height:1200px)_and_(max-width:900px)]:!w-64",
                "[@media(min-height:800px)_and_(min-width:1200px)_and_(max-height:899px)]:!w-40",
                "[@media(width:1280px)_and_(height:800px)]:!w-32",
                "[@media(min-height:1100px)_and_(min-width:1024px)]:!w-44",
                "[@media(min-height:1200px)_and_(min-width:1024px)]:!w-52"
              )}
            />
            <span
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "font-black whitespace-nowrap flex items-center justify-center",
                "text-[16px] tracking-tight pt-1 transition-all duration-500 text-cyan-100 opacity-80",
                "[@media(max-height:650px)]:!text-[12px]",
                "[@media(min-height:700px)_and_(max-height:799px)]:!text-[16px]",
                "[@media(min-height:800px)_and_(max-height:999px)]:!text-[18px]",
                "[@media(min-height:1000px)_and_(max-width:1023px)]:!text-[28px]",
                "[@media(min-height:1200px)_and_(max-width:900px)]:!text-[40px]",
                "[@media(min-height:800px)_and_(min-width:1200px)_and_(max-height:899px)]:!text-[24px]",
                "[@media(width:1280px)_and_(height:800px)]:!text-[20px]",
                "[@media(min-height:1100px)_and_(min-width:1024px)]:!text-[28px]",
                "[@media(min-height:1200px)_and_(min-width:1024px)]:!text-[32px]",
                "sm:text-[18px] md:text-[18px] lg:text-[18px]"
              )}
              style={
                isDark
                  ? { textShadow: "0 0 10px rgba(59,130,246,1), 0 0 20px rgba(59,130,246,0.8)" }
                  : undefined
              }
            >
              {clockHH}
              <span className={cn("inline-block mx-0.5 sm:mx-1", colonVisible ? "opacity-100" : "opacity-0")}>
                :
              </span>
              {clockMM}
            </span>
          </div>

          {/* Heading */}
          <div className={HEADING_CLASSES}>
            <div className="flex flex-col gap-2 sm:gap-3">
              {(["Yearbook Masa", "Lalu? Cringe.", "Saatnya"] as const).map(
                (line, i) => (
                  <span
                    key={i}
                    className="text-white hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
                    style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
                  >
                    {line}{" "}
                    {i === 2 && (
                      <span className="text-yellow-300">Phygital.</span>
                    )}
                  </span>
                )
              )}
            </div>

            <p className="mt-3 sm:mt-4 mb-5 sm:mb-6 max-w-sm sm:max-w-md text-slate-300/80 text-xs sm:text-sm md:text-base font-medium leading-relaxed drop-shadow-sm"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              Ubah kenangan sekolahmu jadi &apos;Living Archive&apos;.<br />
              Gabungan buku fisik premium, teknologi AR,<br />
              dan AI Photo labs. Anti ribet, 100% transparan.
            </p>
          </div>

          {/* CTA + Stats */}
          <div className="px-8 sm:px-20">
            <a href="#pricing">
              <Button
                id="watch-trailer"
                leftIcon={TiLocationArrow}
                containerClass="bg-yellow-300 flex-center gap-1 border border-slate-900 rounded-full shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none font-black text-base"
              >
                Buat Project
              </Button>
            </a>

            <div className="mt-4 sm:mt-6 flex flex-nowrap gap-4 sm:gap-10 md:gap-14">
              <Stat label="Sekolah">
                <AnimatedCounter target={300} suffix="+" />
              </Stat>
              {/* Bug fix #4: formatFn selalu tampilkan dalam K — sebelumnya n<1000 tampil mentah
                  lalu lompat dari "999" ke "1K". Sekarang: 0K → ... → 100K+ */}
              <Stat label="Siswa">
                <AnimatedCounter target={100000} formatFn={formatToK} suffix="K+" />
              </Stat>
              <Stat label="Access">
                <span>Lifetime</span>
              </Stat>
            </div>
          </div>
        </div>
      </div>

      {/* ── Background text layer (parallax ghost) ── */}
      <div className="absolute inset-0 z-0 flex flex-col justify-between pt-6 pb-12 sm:py-10 sm:pb-10 md:pb-12 lg:pb-14 xl:pb-16">
        <div className={HEADING_CLASSES}>
          {/* Bug fix #5: semua span ghost konsisten pakai visibility:hidden.
              Sebelumnya span ketiga tidak hidden → teks "Saatnya Phygital." muncul
              di background layer tanpa disengaja. */}
          <div className="flex flex-col gap-2 sm:gap-3">
            {["Yearbook Masa", "Lalu? Cringe.", "Saatnya Phygital."].map(
              (line, i) => (
                <span
                  key={i}
                  className="text-black hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
                  style={{
                    fontFamily: "var(--font-josefin), sans-serif",
                    fontWeight: 700,
                    visibility: "hidden",
                  }}
                >
                  {line}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stat helper ─────────────────────────────────────────────────────────────

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="special-font text-2xl sm:text-4xl font-bold text-white md:text-5xl [@media(max-height:650px)]:!text-3xl">
        {children}
      </span>
      <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
        {label}
      </span>
    </div>
  );
}
