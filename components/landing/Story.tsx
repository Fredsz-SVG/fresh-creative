'use client';

import { AnimatedTitle } from "./AnimatedTitle";
import { Button } from "./Button";
import { RoundedCorners } from "./RoundedCorners";

export function Story() {
  return (
    <section id="story" className="min-h-dvh w-full bg-black text-blue-50">
      <div className="flex size-full flex-col items-center py-10 pb-24">
        <p className="font-general text-sm uppercase md:text-[10px]" id="demo-ar">
          Coba Demo Interaktif
        </p>

        <div className="relative size-full">
          <AnimatedTitle containerClass="mt-5 pointer-events-none mix-blend-difference relative z-10">
            {"Rasakan sensasi <br /> buku yang bisa bicara"}
          </AnimatedTitle>

          <div className="story-img-container">
            <div className="story-img-mask">
              <div className="story-img-content">
                <img
                  src="/img/entrance.webp"
                  alt="Entrance"
                  className="object-contain story-img-hover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <RoundedCorners />
          </div>
        </div>

        <div className="-mt-80 flex w-full justify-center md:me-44 md:-mt-64 md:justify-end">
          <div className="flex h-full w-fit flex-col items-center md:items-start">
            <p className="font-circular-web mt-3 max-w-sm text-center text-violet-50 md:text-start">
              Teknologi WebAR kami memungkinkan video kenangan muncul melayang di
              atas kertas. Cukup scan QR code di halaman buku dan arahkan kamera
              ke foto.
            </p>
            <Button id="realm-button" containerClass="mt-5">
              Coba WebAR Sekarang
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
