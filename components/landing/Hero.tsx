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

const LOADER_TIMEOUT_MS = 4000;

function AnimatedCounter({ target, suffix = '', duration = 2000, formatFn }: { target: number; suffix?: string; duration?: number; formatFn?: (n: number) => string }) {
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
  return <span ref={ref}>{display}{suffix}</span>;
}

function SplitText({ text, boldIndices = [], className, style }: { text: string; boldIndices?: number[]; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn("flex justify-between w-full items-center", className)} style={style}>
      {text.split('').map((char, i) => (
        <span key={i} className={cn(boldIndices.includes(i) && "font-black")}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasMounted, setHasMounted] = useState(false);
  const theme = useContext(ThemeContext);

  useEffect(() => {
    setHasMounted(true);
    let frameId: number;
    const update = () => {
      setCurrentTime(new Date());
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hideLoader]);

  const handleVideoLoad = () => hideLoader();
  const handleVideoError = () => hideLoader();

  useGSAP(() => {
    const isMobile = window.innerWidth < 768;
    gsap.set("#video-frame", {
      clipPath: isMobile
        ? "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)"
        : "polygon(14% 0%, 72% 0%, 90% 90%, 0% 100%)",
      borderRadius: isMobile ? "0 0 5% 5%" : "0 0 40% 10%",
    });

    if (!isMobile) {
      gsap.from("#video-frame", {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        borderRadius: "0 0 0 0",
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: "#video-frame",
          start: "center center",
          end: "bottom center",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }
  }, [isLoading]);

  useEffect(() => {
    ScrollTrigger.refresh();
    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // // teks setting
  const headingContainerClasses = cn(
    "mt-28 px-8 transition-all duration-500",
    "sm:mt-16 sm:px-20",
    "[@media(width:344px)]:!mt-[18rem] [@media(width:360px)]:!mt-56 [@media(width:375px)]:!mt-56 [@media(width:390px)]:!mt-56",
    "[@media(width:412px)]:!mt-[18rem] [@media(width:414px)]:!mt-56 [@media(width:430px)]:!mt-56 [@media(width:540px)]:!mt-52 [@media(width:393px)]:!mt-[18rem]",
    "[@media(max-height:650px)]:!mt-20 [@media(width:1024px)_and_(height:600px)]:!mt-36 [@media(min-height:651px)]:mt-24 [@media(min-height:700px)]:mt-28 [@media(min-height:800px)]:mt-32 xl:mt-32",
    "[@media(width:1280px)_and_(height:800px)]:!mt-48",
    "[@media(min-height:820px)_and_(max-width:499px)]:!mt-[23rem] [@media(min-height:1000px)]:!mt-[28rem]",
    "[@media(min-height:1100px)]:!mt-[32rem] [@media(min-height:1200px)]:!mt-[36rem] [@media(min-height:1300px)]:!mt-[40rem]"
  );

  return (
    <section id="hero" className="relative h-screen w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-500">
      {isLoading && (
        <div className="flex-center absolute z-[100] h-screen w-full overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500">
          <img src="/img/logo.png" alt="Loading..." className="w-24 sm:w-32 animate-logo-pulse !opacity-100" loading="eager" fetchPriority="high" decoding="async" />
        </div>
      )}

      <div
        id="video-frame"
        className="bg-slate-100 dark:bg-slate-950 relative z-10 h-screen w-full overflow-hidden transition-colors duration-500"
      >
        <div className="relative size-full">
          <video
            src={VIDEO_LINKS.hero1}
            preload="auto"
            autoPlay
            loop
            muted
            playsInline
            className={cn(
              "absolute top-0 left-0 size-full object-cover object-[59%] md:object-center transition-opacity duration-1000",
              theme?.isDark ? "opacity-0" : "opacity-100"
            )}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          />
          <video
            src={VIDEO_LINKS.hero2}
            preload="auto"
            autoPlay
            loop
            muted
            playsInline
            className={cn(
              "absolute top-0 left-0 size-full object-cover object-[59%] md:object-center transition-opacity duration-1000",
              theme?.isDark ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          />
        </div>



        <div className="absolute top-0 left-0 z-40 flex size-full flex-col justify-between pt-6 pb-12 sm:py-10 sm:pb-10 md:pb-12 lg:pb-14 xl:pb-16">

          {/* // jam setting (posisi) */}
          <div className={cn(
            "absolute top-28 left-12 z-50 pointer-events-none flex items-center justify-center transition-all duration-500",
            "sm:top-28 [@media(min-width:1300px)]:!top-16 sm:left-1/2 sm:-translate-x-1/2",
            "[@media(min-height:700px)_and_(max-width:499px)]:top-32 [@media(min-height:700px)_and_(max-width:499px)]:left-8",
            "[@media(min-height:700px)_and_(min-width:500px)]:top-32 [@media(min-height:700px)_and_(min-width:500px)_and_(max-width:767px)]:left-40",
            "[@media(min-height:800px)_and_(max-width:767px)]:left-4 [@media(min-height:820px)_and_(max-width:499px)]:!top-40 [@media(min-height:820px)_and_(max-width:499px)]:!left-8",
            "[@media(max-height:650px)]:top-32 [@media(width:1024px)_and_(height:600px)]:!top-24 [@media(min-height:800px)]:top-36 [@media(width:1280px)_and_(height:800px)]:!top-28 [@media(min-width:1300px)_and_(min-height:800px)]:!top-28 [@media(min-height:1000px)]:!top-[10rem] [@media(min-height:1100px)]:!top-[11rem] [@media(min-height:1200px)]:!top-[12rem] [@media(min-height:1300px)]:!top-[13rem]"
          )}>

            {/* // jam setting (ukuran) */}
            <img
              src="/img/JAM.png"
              alt="Jam"
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
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black whitespace-nowrap flex items-center justify-center text-[16px] [@media(max-height:650px)]:!text-[12px] [@media(min-height:700px)_and_(max-height:799px)]:!text-[16px] [@media(min-height:800px)_and_(max-height:999px)]:!text-[18px] [@media(min-height:1000px)_and_(max-width:1023px)]:!text-[28px] [@media(min-height:1200px)_and_(max-width:900px)]:!text-[40px] [@media(min-height:800px)_and_(min-width:1200px)_and_(max-height:899px)]:!text-[24px] [@media(width:1280px)_and_(height:800px)]:!text-[20px] [@media(min-height:1100px)_and_(min-width:1024px)]:!text-[28px] [@media(min-height:1200px)_and_(min-width:1024px)]:!text-[32px] sm:text-[18px] md:text-[18px] lg:text-[18px] tracking-tight pt-1 transition-all duration-500",
                "text-cyan-100 opacity-80",
              )}
              style={theme?.isDark ? {
                textShadow: '0 0 10px rgba(59,130,246,1), 0 0 20px rgba(59,130,246,0.8)'
              } : {}}
            >
              {hasMounted ? (
                <>
                  {currentTime.getHours().toString().padStart(2, '0')}
                  <span className={cn("inline-block mx-0.5 sm:mx-1", currentTime.getMilliseconds() < 500 ? "opacity-100" : "opacity-0")}>:</span>
                  {currentTime.getMinutes().toString().padStart(2, '0')}
                </>
              ) : (
                <>00<span className="mx-0.5 sm:mx-1 opacity-0">:</span>00</>
              )}
            </span>
          </div>

          <div className={headingContainerClasses}>
            {/* Heading wrapper — width driven by CREATIVE (widest line) */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <span
                className="text-white hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
                style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
              >
                Yearbook Masa
              </span>
              <span
                className="text-white hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
                style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
              >
                Lalu? Cringe.
              </span>
              <span
                className="text-white hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
                style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
              >
                Saatnya <span className="text-yellow-300">Phygital.</span>
              </span>
            </div>
            <p className="mt-3 sm:mt-4 mb-5 sm:mb-6 max-w-sm sm:max-w-md text-slate-300/80 text-xs sm:text-sm md:text-base font-medium leading-relaxed drop-shadow-sm" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              Ubah kenangan sekolahmu jadi &apos;Living Archive&apos;.<br />
              Gabungan buku fisik premium, teknologi AR,<br />
              dan AI Photo labs. Anti ribet, 100% transparan.
            </p>
          </div>

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
              <div className="flex flex-col">
                <span className="special-font text-2xl sm:text-4xl font-bold text-white md:text-5xl [@media(max-height:650px)]:!text-3xl">
                  <AnimatedCounter target={300} suffix="+" />
                </span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Sekolah
                </span>
              </div>
              <div className="flex flex-col">
                <span className="special-font text-2xl sm:text-4xl font-bold text-white md:text-5xl [@media(max-height:650px)]:!text-3xl">
                  <AnimatedCounter target={100000} formatFn={(n) => n >= 1000 ? `${Math.floor(n / 1000)}` : `${n}`} suffix="K+" />
                </span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Siswa
                </span>
              </div>
              <div className="flex flex-col">
                <span className="special-font text-2xl sm:text-4xl font-bold text-white md:text-5xl [@media(max-height:650px)]:!text-3xl">
                  Lifetime
                </span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 z-0 flex size-full flex-col justify-between pt-6 pb-12 sm:py-10 sm:pb-10 md:pb-12 lg:pb-14 xl:pb-16">

        <div className={headingContainerClasses}>
          {/* Ghost duplicate for the black text layer (background) */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <span
              className="text-black hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
              style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700, visibility: 'hidden' }}
            >
              Yearbook Masa
            </span>
            <span
              className="text-black hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
              style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700, visibility: 'hidden' }}
            >
              Lalu? Cringe.
            </span>
            <span
              className="text-black hero-orange-stroke text-[9vw] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] [@media(max-height:650px)]:!text-[2.5rem] leading-[1.2] tracking-tight"
              style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
            >
              Saatnya Phygital.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
