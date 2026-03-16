'use client';

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useState, useContext, useCallback } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { Button } from "./Button";
import { VIDEO_LINKS } from "./constants";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LOADER_TIMEOUT_MS = 4000;

export function Hero() {
  const [isLoading, setIsLoading] = useState(true);
  const theme = useContext(ThemeContext);

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
    gsap.set("#video-frame", {
      clipPath: "polygon(14% 0%, 72% 0%, 90% 90%, 0% 100%)",
      borderRadius: "0 0 40% 10%",
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

  return (
    <section id="hero" className="relative h-dvh w-full overflow-x-hidden">
      {isLoading && (
        <div className="flex-center absolute z-[100] h-dvh w-full overflow-hidden bg-[#dfdff0]">
          <div className="three-body" aria-hidden>
            <div className="three-body__dot" />
            <div className="three-body__dot" />
            <div className="three-body__dot" />
          </div>
        </div>
      )}

      <div
        id="video-frame"
        className="bg-[#dfdff0] relative z-10 h-dvh w-full overflow-hidden"
      >
        <div className="relative size-full">
          <video
            src={VIDEO_LINKS.hero1}
            autoPlay
            loop
            muted
            playsInline
            className={cn(
              "absolute top-0 left-0 size-full object-cover object-center transition-opacity duration-1000",
              theme?.isDark ? "opacity-0" : "opacity-100"
            )}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          />
          <video
            src={VIDEO_LINKS.hero2}
            autoPlay
            loop
            muted
            playsInline
            className={cn(
              "absolute top-0 left-0 size-full object-cover object-center transition-opacity duration-1000",
              theme?.isDark ? "opacity-100" : "opacity-0"
            )}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
          />
        </div>

        <h1
          className="special-font hero-heading text-blue-75 absolute right-4 bottom-4 z-40 drop-shadow-2xl text-[22vw] sm:text-7xl md:text-9xl lg:text-[12rem] leading-[0.8]"
          style={{ WebkitTextStroke: '1.5px #fff', paintOrder: 'stroke fill' }}
        >
          CRE<b>A</b>TIVE
        </h1>

        <div className="absolute top-0 left-0 z-40 flex size-full flex-col justify-between py-6 sm:py-10 pb-16 sm:pb-24 md:pb-40 lg:pb-56 xl:pb-64">
          <div className="mt-20 sm:mt-24 px-5 sm:px-10">
            <h1
              className="special-font hero-heading text-white drop-shadow-2xl text-[22vw] sm:text-7xl md:text-9xl lg:text-[12rem] leading-[0.8]"
              style={{ WebkitTextStroke: '1.5px #fff', paintOrder: 'stroke fill' }}
            >
              FR<b>E</b>SH
            </h1>
          </div>

          <div className="px-5 sm:px-10">
            <p className="mb-6 sm:mb-5 max-w-lg text-base sm:text-lg font-bold leading-[1.4] text-white drop-shadow-md md:text-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Simpan cerita sekolahmu dalam buku fisik maupun digital. <br className="hidden sm:block" />
              Hidupkan setiap momen dengan "Living Archive" yang nyata dan anti ribet.
            </p>

            <a href="#pricing">
              <Button
                id="watch-trailer"
                leftIcon={TiLocationArrow}
                containerClass="bg-yellow-300 flex-center gap-1 active:scale-95 transition-transform"
              >
                Buat Project
              </Button>
            </a>

            <div className="mt-8 sm:mt-10 flex flex-wrap gap-6 sm:gap-10 md:gap-14">
              <div className="flex flex-col">
                <span className="special-font text-3xl sm:text-4xl font-bold text-white md:text-5xl">5+</span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Sekolah
                </span>
              </div>
              <div className="flex flex-col">
                <span className="special-font text-3xl sm:text-4xl font-bold text-white md:text-5xl">1.5k</span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Siswa
                </span>
              </div>
              <div className="flex flex-col">
                <span className="special-font text-3xl sm:text-4xl font-bold text-white md:text-5xl">0%</span>
                <span className="font-general text-[8px] sm:text-[10px] uppercase tracking-widest text-white/60">
                  Pungli
                </span>
              </div>
            </div>

            <div className="mt-0 flex items-center gap-2 text-white/90 drop-shadow-md">
              <span className="font-general text-[10px] sm:text-sm uppercase tracking-wide">
                Tech Partner
              </span>
              <a
                href="https://livephoto.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80 active:opacity-60"
              >
                <img
                  src="/img/livephotos.svg"
                  alt="LivePhotos"
                  className="h-6 sm:h-8 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      <h1
        className="special-font hero-heading absolute right-4 bottom-4 text-black text-[22vw] sm:text-7xl md:text-9xl lg:text-[12rem] leading-[0.8]"
        style={{ WebkitTextStroke: '1.5px #fff', paintOrder: 'stroke fill' }}
      >
        CRE<b>A</b>TIVE
      </h1>
    </section>
  );
}
