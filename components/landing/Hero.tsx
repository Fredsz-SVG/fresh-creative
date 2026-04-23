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
    gsap.from("#video-frame", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0 0 0 0",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#video-frame",
        start: "center center",
        end: "bottom center",
        scrub: true,
      },
    });
  }, [isLoading]);

  // // teks setting
  const headingContainerClasses = cn(
    "mt-28 px-8 transition-all duration-500",
    "sm:mt-16 sm:px-20",
    "[@media(width:344px)]:!mt-52 [@media(width:360px)]:!mt-56 [@media(width:375px)]:!mt-56 [@media(width:390px)]:!mt-56",
    "[@media(width:412px)]:!mt-52 [@media(width:414px)]:!mt-56 [@media(width:430px)]:!mt-56 [@media(width:540px)]:!mt-52 [@media(width:393px)]:!mt-56",
    "[@media(max-height:650px)]:!mt-24 [@media(min-height:700px)]:mt-36 [@media(min-height:800px)]:mt-36",
    "[@media(min-height:820px)_and_(max-width:499px)]:mt-44 [@media(min-height:1000px)]:!mt-[16rem]",
    "[@media(min-height:1100px)]:!mt-[22rem] [@media(min-height:1200px)]:!mt-[32rem] [@media(min-height:1300px)]:!mt-[40rem]"
  );

  return (
    <section id="hero" className="relative h-dvh w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-500">
      {isLoading && (
        <div className="flex-center absolute z-[100] h-dvh w-full overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500">
          <img src="/img/logo.png" alt="Loading..." className="w-24 sm:w-32 animate-logo-pulse !opacity-100" loading="eager" fetchPriority="high" decoding="async" />
        </div>
      )}

      <div
        id="video-frame"
        className="bg-slate-100 dark:bg-slate-950 relative z-10 h-dvh w-full overflow-hidden transition-colors duration-500"
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
              "absolute top-0 left-0 size-full object-cover object-[59%] md:object-center scale-110 md:scale-100 transition-opacity duration-1000",
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
              "absolute top-0 left-0 size-full object-cover object-[59%] md:object-center scale-110 md:scale-100 transition-opacity duration-1000",
              theme?.isDark ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          />
        </div>



        <div className="absolute top-0 left-0 z-40 flex size-full flex-col justify-between pt-6 pb-12 sm:py-10 sm:pb-10 md:pb-12 lg:pb-14 xl:pb-16">

          {/* // jam setting (posisi) */}
          <div className={cn(
            "absolute top-20 left-12 z-50 pointer-events-none flex items-center justify-center transition-all duration-500",
            "sm:top-16 sm:left-1/2 sm:-translate-x-1/2",
            "[@media(min-height:700px)_and_(max-width:499px)]:top-24 [@media(min-height:700px)_and_(max-width:499px)]:left-8",
            "[@media(min-height:700px)_and_(min-width:500px)]:top-22 [@media(min-height:700px)_and_(min-width:500px)_and_(max-width:767px)]:left-32",
            "[@media(min-height:800px)_and_(max-width:767px)]:left-4",
            "[@media(max-height:650px)]:top-24 [@media(min-height:800px)]:top-28 [@media(min-height:1000px)]:!top-[10rem] [@media(min-height:1100px)]:!top-[12rem] [@media(min-height:1200px)]:!top-[16rem]"
          )}>

            {/* // jam setting (ukuran) */}
            <img
              src="/img/JAM.png"
              alt="Jam"
              className={cn(
                "w-28 h-auto object-contain opacity-90 drop-shadow-2xl transition-all duration-500",
                "sm:w-28 md:w-32 lg:w-36",
                "[@media(max-height:650px)]:!w-24 [@media(min-height:700px)]:!w-32 [@media(min-height:800px)]:!w-36",
                "[@media(min-height:1100px)]:!w-[300px] [@media(min-height:1200px)]:!w-[600px]"
              )}
            />
            <span
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-[18px] [@media(max-height:650px)]:!text-[14px] [@media(min-height:700px)]:!text-[21px] [@media(min-height:800px)]:!text-[24px] [@media(min-height:1100px)]:!text-[44px] [@media(min-height:1200px)]:!text-[84px] sm:text-[20px] md:text-[22px] lg:text-[24px] tracking-tight pt-1 transition-all duration-500",
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
            <div className="inline-flex flex-col gap-0 sm:gap-1">
              {/* FRESH — natural width, Josefin */}
              <span
                className="text-white hero-orange-stroke text-[11vw] sm:text-4xl md:text-6xl lg:text-[6rem] [@media(max-height:650px)]:!text-[3.5rem] leading-none tracking-tight"
                style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
              >
                FR<b>E</b>SH
              </span>

              {/* CREATIVE — sets the reference width, Josefin */}
              <span
                id="hero-creative"
                className="text-white hero-orange-stroke text-[11vw] sm:text-4xl md:text-6xl lg:text-[6rem] [@media(max-height:620px)]:!text-[3rem] leading-none tracking-tight"
                style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700 }}
              >
                CR<b>E</b>ATIVE
              </span>

              {/* INDONESIA — stretches to match CREATIVE width, Inter */}
              <SplitText
                text="INDONESIA"
                className="hero-orange-stroke w-full leading-none text-[1.2em] sm:text-[2em] text-yellow-300"
                style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 500 }}
              />
            </div>
            <p className="mt-2 sm:mt-4 mb-6 sm:mb-5 max-w-lg text-base sm:text-lg [@media(max-height:650px)]:!text-base font-bold leading-[1.4] text-white drop-shadow-md md:text-2xl" style={{ fontFamily: "var(--font-inter), sans-serif", WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}>
              Simpan momen sekolahmu <br />
              lebih nyata. Fisik, Digital, & <br />
              Anti Ribet
            </p>
          </div>

          <div className="px-8 sm:px-20">

            <a href="#pricing">
              <Button
                id="watch-trailer"
                leftIcon={TiLocationArrow}
                containerClass="bg-yellow-300 flex-center gap-1 border border-slate-200 rounded-full shadow-[2px_2px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] transition-all active:translate-x-0 active:translate-y-0 active:shadow-none font-black text-base"
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
          <div className="inline-flex flex-col gap-0 sm:gap-1">
            <span
              className="text-black hero-orange-stroke text-[11vw] sm:text-4xl md:text-6xl lg:text-[6rem] [@media(max-height:650px)]:!text-[3.5rem] leading-none tracking-tight"
              style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700, visibility: 'hidden' }}
            >
              FR<b>E</b>SH
            </span>
            <span
              className="text-black hero-orange-stroke text-[11vw] sm:text-4xl md:text-6xl lg:text-[6rem] [@media(max-height:650px)]:!text-[3.5rem] leading-none tracking-tight"
              style={{ fontFamily: "var(--font-josefin), sans-serif", fontWeight: 700, visibility: 'hidden' }}
            >
              CR<b>E</b>ATIVE
            </span>
            <SplitText
              text="INDONESIA"
              className="hero-orange-stroke w-full leading-none text-[1.2em] sm:text-[2em]"
              style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 500 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
