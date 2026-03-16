'use client';

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatedTitle } from "./AnimatedTitle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function About() {
  useGSAP(() => {
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#about-clip",
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
      },
    });
    clipAnimation.to("#about-clip .mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });
  }, []);

  return (
    <div id="about" className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 transition-colors duration-500 pt-36 pb-8">
      <div className="relative flex flex-col items-center gap-5">
        <p className="font-general text-base uppercase md:text-lg text-slate-500 dark:text-slate-400">
          Welcome to Fresh Creative
        </p>

        <AnimatedTitle containerClass="mt-5 text-center font-zentry !text-black dark:!text-white">
          {"Beyond Traditional <br /> Yearbook"}
        </AnimatedTitle>

        <div className="about-subtext text-slate-700 dark:text-slate-300 font-bold leading-relaxed px-6">
          <p>
            Ekosistem <span className="text-black dark:text-white font-black">Buku Fisik & Digital</span> yang hidup lewat keajaiban <span className="text-lime-600 dark:text-lime-400">WebAR</span>,
            didukung sesi <span className="text-black dark:text-white font-black">foto dan video</span> kreatif hingga layanan <span className="text-black dark:text-white font-black">Event Organizer</span> yang lengkap.
            <br />
            <span className="special-font text-base md:text-xl mt-4 block text-black dark:text-white">"Kenangan Jadi Nyata."</span>
          </p>
        </div>
      </div>

      <div id="about-clip" className="h-dvh w-full">
        <div className="mask-clip-path about-image">
          <img
            src="/img/about.webp"
            alt="Fresh Creative Yearbook"
            className="absolute top-0 left-0 size-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
