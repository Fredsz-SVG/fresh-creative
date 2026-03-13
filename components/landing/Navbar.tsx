'use client';

import { useEffect, useRef, useState, useContext } from "react";
import { Sun, Moon } from "lucide-react";
import { NAV_ITEMS } from "./constants";
import { cn } from "@/lib/utils";
import { ThemeContext } from "@/app/providers/ThemeProvider";

export function Navbar() {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const theme = useContext(ThemeContext);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
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
      className="fixed inset-x-0 top-4 z-50 h-16 border-none transition-transform duration-200 ease-out sm:inset-x-6"
    >
      <div className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          <div className="flex items-center gap-7">
            <a
              href="#hero"
              className={cn(
                "transition hover:opacity-100",
                theme?.isDark && "drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
              )}
            >
              <img src="/img/logo.png" alt="Logo" className="w-10" loading="lazy" />
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

            <div className="flex items-center gap-4">
              <button
                onClick={theme?.toggleTheme}
                className="nav-icon-stroke ml-10 flex items-center p-2 text-white transition hover:opacity-100"
                title="Toggle Theme"
              >
                {mounted &&
                  (theme?.isDark ? (
                    <Sun size={20} aria-hidden strokeWidth={2.5} />
                  ) : (
                    <Moon size={20} aria-hidden strokeWidth={2.5} />
                  ))}
              </button>

              <button
                onClick={toggleAudioIndicator}
                className="nav-icon-stroke flex items-center space-x-1 p-2 text-white transition hover:opacity-100"
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
                        "indicator-line !bg-white shadow-[0_0_0_1px_#000]",
                        isIndicatorActive && "active"
                      )}
                      style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    />
                  ))}
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
