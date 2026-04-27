'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

interface PortfolioItem {
  id: string | number;
  img: string;
  title: string;
  subtitle: string;
  desc: string;
}

export function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isJumping = useRef(false);

  // Triple the items for mathematical infinite scrolling
  const infiniteItems = items.length > 0 ? [...items, ...items, ...items] : [];

  useEffect(() => {
    // Quietly position at the middle set on load to allow immediate left-scrolling
    requestAnimationFrame(() => {
      if (sliderRef.current && infiniteItems.length > 0) {
        sliderRef.current.scrollLeft = sliderRef.current.scrollWidth / 3;
      }
    });
  }, [items]);

  useEffect(() => {
    // Attempt to load from cache immediately on mount to prevent loading flash if data exists
    try {
      const cached = localStorage.getItem('portfolio-data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      // Quietly ignore parse errors
    }

    const fetchPortfolio = async () => {
      try {
        const res = await fetch(apiUrl("/api/portfolio"));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
            localStorage.setItem('portfolio-data', JSON.stringify(data));
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

  const slideLeft = () => {
    if (sliderRef.current) {
      const cardWidth = (sliderRef.current.children[0] as HTMLElement)?.offsetWidth || 300;
      sliderRef.current.scrollBy({ left: -(cardWidth + 32), behavior: "smooth" }); 
    }
  };

  const slideRight = () => {
    if (sliderRef.current) {
      const cardWidth = (sliderRef.current.children[0] as HTMLElement)?.offsetWidth || 300;
      sliderRef.current.scrollBy({ left: cardWidth + 32, behavior: "smooth" });
    }
  };

  const handleInfiniteScroll = () => {
    const el = sliderRef.current;
    if (!el || isJumping.current || items.length === 0) return;

    const oneSetWidth = el.scrollWidth / 3;

    // Jump forward if user hits the left wall
    if (el.scrollLeft <= 5) {
      isJumping.current = true;
      el.scrollLeft += oneSetWidth;
      requestAnimationFrame(() => { isJumping.current = false; });
    } 
    // Jump backward if user hits the right wall
    else if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
      isJumping.current = true;
      el.scrollLeft -= oneSetWidth;
      requestAnimationFrame(() => { isJumping.current = false; });
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    isDragging.current = true;
    if (sliderRef.current) {
      startX.current = e.pageX - sliderRef.current.offsetLeft;
      scrollLeft.current = sliderRef.current.scrollLeft;
    }
  };

  const endDrag = () => {
    isDragging.current = false;
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    sliderRef.current.scrollLeft = scrollLeft.current - walk;
  };

  if (loading) {
    return (
      <section id="portfolio" className="w-full bg-slate-100 dark:bg-slate-950 py-16 sm:py-24 transition-colors duration-500">
        <div className="container mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
            <div>
              <div className="h-4 w-24 bg-lime-200 dark:bg-lime-900 rounded-full mb-3 animate-pulse" />
              <div className="h-10 sm:h-12 lg:h-16 w-64 bg-slate-200 dark:bg-slate-900 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section id="portfolio" className="w-full bg-slate-100 dark:bg-slate-950 py-16 sm:py-24 transition-colors duration-500 overflow-hidden relative">
      <div className="container mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-6 relative z-10">
          <div className="text-left">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-lime-600 dark:text-lime-400 font-black mb-3 drop-shadow-sm">
              Discover
            </p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-[1.1]">
              Port<span className="text-lime-500">folio</span>.
            </h2>
            <p className="font-general max-w-2xl mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Kumpulan momen dan karya fotografi terbaik yang diabadikan oleh Fresh Creative.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={slideLeft}
              className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.05)] hover:shadow-[6px_6px_0px_#0f172a] dark:hover:shadow-[6px_6px_0px_rgba(132,204,22,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_#0f172a] transition-all text-slate-900 dark:text-lime-400 outline-none"
              aria-label="Previous portfolio item"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={slideRight}
              className="w-12 h-12 flex items-center justify-center bg-lime-400 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_#0f172a] transition-all text-slate-900 outline-none"
              aria-label="Next portfolio item"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Container - Full Bleed Edge-to-Edge Infinite Loop */}
      <div 
        ref={sliderRef}
        onMouseDown={startDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onMouseMove={onDragMove}
        onScroll={handleInfiniteScroll}
        className="flex overflow-x-auto gap-6 sm:gap-8 pt-10 pb-16 px-6 sm:px-8 hide-scrollbar cursor-grab active:cursor-grabbing select-none relative z-0 w-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {infiniteItems.map((item, idx) => (
          <motion.div
            key={`${item.id}-${idx}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-none w-[85vw] sm:w-[60vw] md:w-[45vw] lg:w-[31vw] xl:w-[28vw] group flex flex-col bg-white dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-800 rounded-2xl overflow-hidden shadow-[6px_6px_0_0_#334155] dark:shadow-neo-glow transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden border-b-2 border-slate-900 dark:border-slate-800 bg-slate-200 dark:bg-slate-900">
              <Image
                src={item.img}
                alt={item.title}
                fill
                draggable={false}
                className="object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-in-out"
                sizes="(max-width: 768px) 85vw, (max-width: 1024px) 50vw, 33vw"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0 pointer-events-none" />

              <div className="absolute top-4 left-4 z-10 transition-transform duration-300 group-hover:-translate-y-1">
                <div className="bg-lime-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-[2px_2px_0px_#000] border-2 border-slate-900 -rotate-2 group-hover:rotate-0 transition-transform duration-300">
                  {item.subtitle}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 flex flex-col flex-grow relative z-10">
              <h3 className="font-zentry text-2xl sm:text-3xl font-black text-white [-webkit-text-stroke:1px_black] sm:[-webkit-text-stroke:1.5px_black] mb-2 leading-none tracking-wide group-hover:text-lime-400 transition-colors duration-300 line-clamp-1 drop-shadow-sm pointer-events-none">
                {item.title}
              </h3>
              <p className="font-general text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-6 pointer-events-none">
                {item.desc}
              </p>
              <div className="mt-auto w-full">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setSelectedImg(item.img); }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-900 hover:bg-lime-400 dark:hover:bg-lime-400 text-slate-900 dark:text-white dark:hover:text-slate-900 font-bold text-xs uppercase tracking-widest border-2 border-slate-900 dark:border-slate-800 dark:hover:border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:shadow-[6px_6px_0_0_#0f172a] hover:-translate-y-0.5 active:translate-y-0 transition-all outline-none"
                >
                  <Maximize2 size={16} strokeWidth={3} className="shrink-0" />
                  Full View
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedImg(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8"
          >
            <button 
              onClick={() => setSelectedImg(null)}
              className="absolute top-6 right-6 sm:top-10 sm:right-10 z-[101] w-12 h-12 flex items-center justify-center bg-white text-slate-950 border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:bg-lime-400 hover:-translate-y-1 transition-all rounded-full outline-none"
              aria-label="Close modal"
            >
              <X size={24} strokeWidth={3} />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-7xl h-full max-h-[90vh] outline-none"
            >
              <Image
                src={selectedImg}
                alt="Enlarged Portfolio View"
                fill
                quality={100}
                className="object-contain drop-shadow-2xl"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </section>
  );
}
