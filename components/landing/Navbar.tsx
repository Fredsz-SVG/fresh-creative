'use client';

import { useEffect, useRef, useState, useContext } from "react";
import { Sun, MoonStar, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TiLocationArrow } from "react-icons/ti";
import { NAV_ITEMS } from "./constants";
import { cn } from "@/lib/utils";
import { ThemeContext } from "@/app/providers/ThemeProvider";

export function Navbar() {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const theme = useContext(ThemeContext);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audio")
      .then((res) => res.ok ? res.json() : { files: [] })
      .then((data: { files?: string[] }) => {
        const files = data?.files ?? [];
        if (files.length > 0) {
          const pick = files[Math.floor(Math.random() * files.length)];
          setAudioSrc(pick);
        }
      })
      .catch(() => {});
  }, []);

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((p) => !p);
    setIsIndicatorActive((p) => !p);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAudioPlaying) void audioElementRef.current?.play();
    else audioElementRef.current?.pause();
  }, [isAudioPlaying, audioSrc]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const aboutEl = document.getElementById("about");
      const aboutTop = aboutEl ? aboutEl.getBoundingClientRect().top + y : window.innerHeight;
      const isPastAbout = y >= aboutTop - window.innerHeight;

      if (y === 0) {
        navContainerRef.current?.classList.remove("floating-nav");
      } else if (isPastAbout) {
        navContainerRef.current?.classList.add("floating-nav");
      } else {
        navContainerRef.current?.classList.add("floating-nav");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={navContainerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-14 border-none transition-all duration-200 ease-out sm:h-16 rounded-none",
        isMenuOpen && "!shadow-none !border-b-0"
      )}
    >
      <div className="absolute top-1/2 w-full -translate-y-1/2 z-50">
        <nav className="flex size-full items-center justify-between px-4 sm:p-4">
          <div className="flex items-center gap-4 sm:gap-7">
            <a
              href="#hero"
              className={cn(
                "transition hover:opacity-100",
                theme?.isDark && "drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
              )}
            >
              <img src="/img/logo.png" alt="Logo" className="w-8 sm:w-10 animate-logo-pulse" loading="lazy" />
            </a>
          </div>

          <div className="flex h-full items-center">
            <div className="hidden md:block">
              {NAV_ITEMS.map(({ label, href }) => (
                <a key={href} href={href} className="nav-hover-btn">
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
              <a
                href="#pricing"
                className="hidden md:inline-flex items-center gap-1 md:ml-8 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#a3e635] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:hover:shadow-[3px_3px_0_0_#a3e635] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
              >
                <TiLocationArrow className="text-base" />
                <span className="font-general text-xs uppercase">Buat Project</span>
              </a>
              <button
                onClick={theme?.toggleTheme}
                className="nav-icon-stroke md:ml-4 flex items-center justify-center p-2 text-slate-800 dark:text-white transition hover:opacity-100 active:scale-90 rounded-none w-10 h-10 overflow-hidden"
                title="Toggle Theme"
              >
                <AnimatePresence mode="wait">
                  {mounted &&
                    (theme?.isDark ? (
                      <motion.div
                        key="sun"
                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center"
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          className="sm:size-[20px]" 
                          aria-hidden 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="4" fill="currentColor" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="M4.93 4.93l1.41 1.41" />
                          <path d="M17.66 17.66l1.41 1.41" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="M4.93 19.07l1.41-1.41" />
                          <path d="M17.66 6.34l1.41-1.41" />
                        </svg>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="moon"
                        initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center"
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          className="sm:size-[20px]" 
                          aria-hidden 
                          fill="currentColor"
                        >
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
                        </svg>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </button>

              <button
                onClick={toggleAudioIndicator}
                className="nav-icon-stroke flex items-center space-x-1 p-2 text-slate-800 dark:text-white transition hover:opacity-100 active:scale-90 rounded-none"
                title="Play Audio"
              >
                {audioSrc && (
                  <audio
                    ref={audioElementRef}
                    src={audioSrc}
                    className="hidden"
                    loop
                    preload="none"
                  />
                )}
                {Array(4)
                  .fill("")
                  .map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "indicator-line bg-slate-900 dark:bg-white",
                        isIndicatorActive && "active"
                      )}
                      style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    />
                  ))}
              </button>
            </div>
            
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden ml-2 flex items-center p-2 text-slate-800 dark:text-white transition hover:opacity-100 rounded-none nav-icon-stroke"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-x-0 top-0 bg-white dark:bg-slate-950 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden flex flex-col items-center gap-6 pt-[88px] sm:pt-[100px] pb-10 z-[40]",
          isMenuOpen ? "translate-y-0 opacity-100 visible shadow-2xl border-b-2 border-slate-200 dark:border-white/20" : "-translate-y-8 opacity-0 invisible pointer-events-none"
        )}
      >
        {NAV_ITEMS.map(({ label, href }) => (
          <a 
            key={href} 
            href={href} 
            className="text-lg font-bold text-slate-900 dark:text-white hover:text-lime-500 transition-colors py-2 uppercase tracking-wide w-full text-center"
            onClick={() => setIsMenuOpen(false)}
          >
            {label}
          </a>
        ))}
        <a
          href="#pricing"
          className="mt-2 inline-flex items-center justify-center gap-1 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:hover:shadow-[3px_3px_0_0_#fff] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200 w-[80%]"
          onClick={() => setIsMenuOpen(false)}
        >
          <TiLocationArrow className="text-lg" />
          <span className="font-general text-xs uppercase">Buat Project</span>
        </a>
      </div>
    </header>
  );
}
