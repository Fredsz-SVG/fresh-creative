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
    <div id="about" className="min-h-screen w-full">
      <div className="relative mt-36 mb-8 flex flex-col items-center gap-5">
        <p className="font-general text-sm uppercase md:text-base">
          Welcome to Fresh Creative
        </p>

        <AnimatedTitle containerClass="mt-5 !text-black text-center">
          {"Beyond Tr<b>a</b>ditional <br /> Yearbook"}
        </AnimatedTitle>

        <div className="about-subtext !text-black/80 font-bold leading-relaxed">
          <p>
            Ekosistem <span className="text-black font-black">Buku Fisik & Digital</span> yang hidup lewat keajaiban <span className="text-lime-600">WebAR</span>,
            didukung sesi <span className="text-black font-black">foto dan video</span> kreatif hingga layanan <span className="text-black font-black">Event Organizer</span> yang lengkap.
            <br />
            <span className="special-font text-xl mt-4 block text-black">"Kenangan Jadi Nyata."</span>
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
