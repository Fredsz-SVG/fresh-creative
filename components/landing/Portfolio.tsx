'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedTitle } from "./AnimatedTitle";
import { ChevronRight } from "lucide-react";

const PORTFOLIO_ITEMS = [
  {
    id: "american",
    img: "/img/about.webp",
    title: "American 90s",
    subtitle: "Retro & Nostalgic",
    desc: "Rasakan vibe nostalgia ala film remaja 90-an. Lengkap dengan varsity jackets, locker room aesthetics, dan tone warna retro vintage."
  },
  {
    id: "korean",
    img: "/img/yearbooks.png",
    title: "Korean High School",
    subtitle: "Clean & Aesthetic",
    desc: "Tampil menawan dengan seragam preppies ala drakor, pencahayaan soft, dan set kelas modern yang bikin fotomu seestetik idol."
  },
  {
    id: "cyberpunk",
    img: "/img/sesifoto.jpg",
    title: "Cyberpunk Night",
    subtitle: "Futuristic & Edgy",
    desc: "Berani beda dengan konsep futuristik! Menghadirkan permainan lampu neon, asap dramatis, dan angle dinamis layaknya film sci-fi."
  },
  {
    id: "classic",
    img: "/img/organizer.jpg",
    title: "Classic Prom",
    subtitle: "Elegant & Timeless",
    desc: "Gayamu dalam balutan jas dan gaun malam. Mengusung konsep classic luxury dengan properti mewah yang tak lekang oleh waktu."
  }
];

export function About() {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = PORTFOLIO_ITEMS[activeIndex];

  // Helper unshift array to always show unselected items in the queue
  const queueItems = [
    ...PORTFOLIO_ITEMS.slice(activeIndex + 1),
    ...PORTFOLIO_ITEMS.slice(0, activeIndex)
  ];

  return (
    <section id="about" className="w-full bg-slate-100 dark:bg-slate-950 pt-24 sm:pt-32 transition-colors duration-500">
      <div className="container mx-auto px-6 sm:px-10 mb-8 sm:mb-10 text-center sm:text-left">
        <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3">
          Discover
        </p>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
          Port<span className="text-lime-500">folio</span>.
        </h2>
      </div>

      <div className="relative h-[80vh] sm:h-[85vh] w-full overflow-hidden shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.8)] border-t border-slate-200 dark:border-white/10 bg-slate-950">
        {/* BACKGROUND IMAGE WITH SMOOTH CROSSFADE */}
        <AnimatePresence initial={false}>
          <motion.img
            key={activeItem.id}
            src={activeItem.img}
            alt={activeItem.title}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 size-full object-cover object-center"
          />
        </AnimatePresence>

        {/* OVERLAY GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none" />

        {/* MAIN CONTENT AREA */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 lg:p-16 pb-32 sm:pb-36 lg:pb-16 z-10 w-full lg:w-[65%]">
          <div className="overflow-hidden mb-2">
            <motion.div
              key={`subtitle-${activeItem.id}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block rounded-full border border-lime-400/50 bg-black/30 px-4 py-1.5 backdrop-blur-md"
            >
              <p className="font-general text-[10px] sm:text-xs font-bold uppercase tracking-widest text-lime-400">
                {activeItem.subtitle}
              </p>
            </motion.div>
          </div>

          <AnimatedTitle
            key={`title-${activeItem.id}`}
            containerClass="text-left font-zentry !text-white text-3xl sm:text-5xl lg:text-6xl leading-[0.9] tracking-tight mb-3 drop-shadow-2xl"
          >
            {activeItem.title}
          </AnimatedTitle>

          <motion.p
            key={`desc-${activeItem.id}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-lg font-general text-xs sm:text-sm md:text-base font-bold text-slate-300 leading-relaxed drop-shadow-md"
          >
            {activeItem.desc}
          </motion.p>
        </div>

        {/* SLIDER THUMBNAILS (Neo-Brutalist inspired) */}
        <div className="absolute bottom-4 sm:bottom-8 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 right-2 sm:right-6 lg:right-10 z-20 flex lg:flex-col gap-3 sm:gap-4 max-w-[calc(100vw-16px)] overflow-x-auto lg:overflow-visible no-scrollbar p-6 lg:p-4">
          <AnimatePresence mode="popLayout">
            {queueItems.map((item) => (
              <motion.button
                key={item.id}
                layoutId={`card-${item.id}`}
                onClick={() => setActiveIndex(PORTFOLIO_ITEMS.findIndex(p => p.id === item.id))}
                initial={{ opacity: 0, scale: 0.8, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -50 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group relative h-20 w-16 sm:h-28 sm:w-20 lg:h-36 lg:w-28 shrink-0 rounded-2xl border-2 border-white/20 hover:border-lime-400 overflow-hidden shadow-2xl transition-colors bg-slate-900 focus:outline-none"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 text-left">
                  <p className="font-zentry text-[10px] sm:text-xs text-white leading-tight drop-shadow-md">
                    {item.title}
                  </p>
                </div>

                {/* Hover Indicator */}
                <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-lime-400 text-black opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronRight className="size-3" strokeWidth={3} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* SLIDER PROGRESS OUTLINE */}
        <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-12 z-20 flex gap-2">
          {PORTFOLIO_ITEMS.map((_, idx) => (
            <div
              key={idx}
              className={`transition-all duration-300 h-1 sm:h-1.5 rounded-full ${
                idx === activeIndex
                  ? "w-8 sm:w-12 bg-lime-400"
                  : "w-2 sm:w-3 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
