'use client';

import { useEffect, useRef, useState, useContext } from "react";
import { Sun, MoonStar, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TiLocationArrow } from "react-icons/ti";
import Link from "next/link";
import { NAV_ITEMS } from "./constants";
import { cn } from "@/lib/utils";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { LayoutDashboard, PlusCircle, ChevronDown } from "lucide-react";

export function Navbar() {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const theme = useContext(ThemeContext);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/audio")
      .then((res) => res.ok ? res.json() : { files: [] })
      .then((data: { files?: string[] }) => {
        const files = data?.files ?? [];
        if (files.length > 0) {
          setAudioFiles(files);
        }
      })
      .catch(() => {});
  }, []);

  const audioSrc = audioFiles[currentTrackIndex] ?? null;

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((p) => !p);
    setIsIndicatorActive((p) => !p);
  };

  const handleTrackEnded = () => {
    if (audioFiles.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % audioFiles.length);
  };

  useEffect(() => {
    setMounted(true);
    
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAudioPlaying) void audioElementRef.current?.play();
    else audioElementRef.current?.pause();
  }, [isAudioPlaying, audioSrc]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;
    audio.addEventListener("ended", handleTrackEnded);
    return () => audio.removeEventListener("ended", handleTrackEnded);
  }, [audioFiles]);

  useEffect(() => {
    if (isAudioPlaying && audioElementRef.current) {
      audioElementRef.current.play().catch(() => {});
    }
  }, [currentTrackIndex, isAudioPlaying]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;

      if (y <= 300) {
        navContainerRef.current?.classList.remove("floating-nav");
        setIsScrolled(false);
      } else {
        navContainerRef.current?.classList.add("floating-nav");
        setIsScrolled(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={navContainerRef}
      className={cn(
        "fixed left-4 right-4 top-4 z-50 h-14 transition-all duration-300 ease-out sm:h-16 rounded-full border border-transparent",
        isMenuOpen && "!shadow-none !border-transparent"
      )}
    >
      <div className="absolute top-1/2 w-full -translate-y-1/2 z-50">
        <nav className="flex size-full items-center justify-between px-4 sm:p-4">
          <div className="flex items-center gap-4 sm:gap-7">
            <a
              href="#hero"
              className={cn(
                "transition hover:opacity-100 flex items-center",
                theme?.isDark && "drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
              )}
            >
              <img src="/img/logo.png" alt="Logo" className="w-8 sm:w-10 animate-logo-pulse shrink-0" loading="lazy" />
              <span 
                className={cn(
                  "font-black text-sm tracking-widest uppercase transition-all duration-500 whitespace-nowrap text-slate-800 dark:text-white",
                  isScrolled ? "opacity-100 w-[160px] ml-3" : "opacity-0 w-0 ml-0 pointer-events-none"
                )}
              >
                FRESHCREATIVE.ID
              </span>
            </a>
          </div>

          <div className="flex h-full items-center">
            <div className="hidden md:flex items-center gap-8 mr-8">
              {NAV_ITEMS.map(({ label, href }) => (
                <a key={href} href={href} className="nav-hover-btn !ms-0">
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
              <div className="relative hidden md:block" ref={dropdownRef}>
                {!user ? (
                  <a
                    href="#pricing"
                    className="inline-flex items-center gap-2 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#a3e635] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:hover:shadow-[3px_3px_0_0_#a3e635] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
                  >
                    <TiLocationArrow className="text-base" />
                    <span className="font-general text-xs uppercase">Buat Project</span>
                  </a>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="inline-flex items-center gap-2 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#a3e635] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:hover:shadow-[3px_3px_0_0_#a3e635] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200"
                    >
                      <TiLocationArrow className="text-base" />
                      <span className="font-general text-xs uppercase">Buat Project</span>
                      <ChevronDown className={cn("size-4 transition-transform duration-300", isProjectDropdownOpen && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {isProjectDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl border-2 border-slate-200 dark:border-white/20 bg-white dark:bg-slate-900 p-2 shadow-2xl backdrop-blur-xl z-[60]"
                        >
                          <Link
                            href="/user"
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-black text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors uppercase tracking-tight"
                            onClick={() => setIsProjectDropdownOpen(false)}
                          >
                            <LayoutDashboard className="size-4 text-orange-500" />
                            Masuk Dashboard
                          </Link>
                          <a
                            href="#pricing"
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-black text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors uppercase tracking-tight"
                            onClick={() => setIsProjectDropdownOpen(false)}
                          >
                            <PlusCircle className="size-4 text-lime-500" />
                            Buat Project
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
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
          "fixed inset-x-0 top-0 bg-white dark:bg-slate-950 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden flex flex-col items-center gap-6 pt-[100px] sm:pt-[120px] pb-10 z-[40]",
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
        {!user ? (
          <a
            href="#pricing"
            className="mt-2 inline-flex items-center justify-center gap-1 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] dark:hover:shadow-[3px_3px_0_0_#fff] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-200 w-[80%]"
            onClick={() => setIsMenuOpen(false)}
          >
            <TiLocationArrow className="text-lg" />
            <span className="font-general text-xs uppercase">Buat Project</span>
          </a>
        ) : (
          <>
            <Link
              href="/user"
              className="mt-2 inline-flex items-center justify-center gap-3 px-7 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wide border-2 border-slate-200 dark:border-white/20 rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 w-[80%]"
              onClick={() => setIsMenuOpen(false)}
            >
              <LayoutDashboard className="size-4 text-orange-500" />
              Masuk Dashboard
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-3 px-7 py-3 bg-yellow-300 text-black font-black text-xs uppercase tracking-wide border border-slate-200 dark:border-white rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 w-[80%]"
              onClick={() => setIsMenuOpen(false)}
            >
              <PlusCircle className="size-4 text-slate-900" />
              Buat Project
            </a>
          </>
        )}
      </div>
    </header>
  );
}
