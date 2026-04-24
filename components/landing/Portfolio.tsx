'use client';

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedTitle } from "./AnimatedTitle";



import { apiUrl } from "@/lib/api-url";

export function Portfolio() {
  const [items, setItems] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const dragStartPos = useRef<{x: number, y: number} | null>(null);
  const SWIPE_THRESHOLD = 50;

  const total = items.length;

  const goNext = useCallback(() => {
    if (total === 0) return;
    setActiveIndex(i => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    if (total === 0) return;
    setActiveIndex(i => (i - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch(apiUrl("/api/portfolio"));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch portfolio:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragStartPos.current) return;
    const deltaX = e.changedTouches[0].clientX - dragStartPos.current.x;
    const deltaY = e.changedTouches[0].clientY - dragStartPos.current.y;
    dragStartPos.current = null;
    
    // Only trigger swipe if horizontal movement is greater than vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      deltaX < 0 ? goNext() : goPrev();
    }
  };

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragStartPos.current) return;
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    dragStartPos.current = null;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      deltaX < 0 ? goNext() : goPrev();
    }
  };
  const onMouseLeave = () => { dragStartPos.current = null; };

  if (loading) {
    return (
      <section className="w-full bg-slate-100 dark:bg-slate-950 pt-16 sm:pt-20 transition-colors duration-500">
        <div className="container mx-auto px-6 sm:px-10 mb-8 sm:mb-10">
          <div className="h-4 w-24 bg-lime-200 dark:bg-lime-900 rounded-full mb-3 animate-pulse" />
          <div className="h-10 sm:h-12 lg:h-14 w-64 bg-slate-200 dark:bg-slate-900 rounded-2xl animate-pulse" />
        </div>
        <div className="relative h-[90vh] sm:h-screen w-full overflow-hidden bg-slate-200 dark:bg-slate-900 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-50" />
          <div className="absolute bottom-12 left-12 space-y-4">
            <div className="h-4 w-32 bg-lime-400 opacity-20 rounded-lg" />
            <div className="h-12 w-64 bg-white opacity-10 rounded-xl" />
            <div className="h-4 w-96 bg-slate-400 opacity-10 rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const activeItem = items[activeIndex];

  // Helper unshift array to always show unselected items in the queue
  const queueItems = [
    ...items.slice(activeIndex + 1),
    ...items.slice(0, activeIndex)
  ];

  return (
    <section id="about" className="w-full bg-slate-100 dark:bg-slate-950 pt-16 sm:pt-20 transition-colors duration-500">
      <div className="container mx-auto px-6 sm:px-10 mb-8 sm:mb-10 text-center sm:text-left">
        <p className="font-general text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3">
          Discover
        </p>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
          Port<span className="text-lime-500">folio</span>.
        </h2>
        
        {/* PRELOAD ALL IMAGES TO PREVENT BLANK DELAYS */}
        <div className="hidden">
          {items.map((item, idx) => (
            <img key={`preload-${item.id || idx}`} src={item.img} alt="" loading="eager" fetchPriority="high" />
          ))}
        </div>
      </div>

      <div
        className="group/hero relative h-[90vh] sm:h-screen w-full overflow-hidden shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.8)] border-t border-slate-200 dark:border-white/10 bg-slate-950 select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* BACKGROUND IMAGE WITH SMOOTH CROSSFADE */}
        <AnimatePresence initial={false}>
          <motion.img
            key={activeItem.id}
            src={activeItem.img}
            alt={activeItem.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 size-full object-cover object-center"
          />
        </AnimatePresence>

        {/* OVERLAY GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/20 to-transparent pointer-events-none" />

        {/* MAIN CONTENT AREA */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 lg:p-16 pb-12 sm:pb-16 lg:pb-16 z-10 w-full lg:w-[65%]">
          <div className="pb-3 pr-3 mb-2">
            <motion.div
              key={`subtitle-${activeItem.id}`}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="inline-flex items-center -rotate-[1deg] origin-left"
              style={{ filter: "drop-shadow(2px 0px 0px #000) drop-shadow(-2px 0px 0px #000) drop-shadow(0px 2px 0px #000) drop-shadow(0px -2px 0px #000) drop-shadow(6px 6px 0px #ffffff)" }}
            >
              <div
                className="bg-lime-400 pl-3 pr-5 py-[5px]"
                style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
              >
                <span className="font-general text-[9px] sm:text-[10px] font-black uppercase tracking-[0.28em] text-slate-950">
                  {activeItem.subtitle}
                </span>
              </div>
            </motion.div>
          </div>

          <AnimatedTitle
            key={`title-${activeItem.id}`}
            containerClass="text-left font-zentry !text-white text-3xl sm:text-5xl lg:text-6xl leading-[0.9] tracking-tight mb-3 drop-shadow-2xl [-webkit-text-stroke:1.5px_black]"
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

        {/* NAVIGATION ARROWS - Visible on all sizes */}
        <div className="absolute inset-y-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-8 lg:px-12 pointer-events-none">
          <button 
            onClick={goPrev}
            className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full text-white/50 hover:text-white hover:bg-white/25 transition-all active:scale-90 border border-white/10 shadow-lg"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>
          <button 
            onClick={goNext}
            className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full text-white/50 hover:text-white hover:bg-white/25 transition-all active:scale-90 border border-white/10 shadow-lg"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>
        </div>



        {/* SLIDER PROGRESS OUTLINE */}
        <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-12 z-20 flex gap-2">
          {items.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`cursor-pointer transition-all duration-300 h-1 sm:h-1.5 rounded-full ${
                idx === activeIndex
                  ? "w-8 sm:w-12 bg-lime-400"
                  : "w-2 sm:w-3 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
