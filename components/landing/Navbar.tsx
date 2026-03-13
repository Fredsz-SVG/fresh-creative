'use client';

import { useEffect, useRef, useState, useContext } from "react";
import { FaGithub } from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { LINKS, NAV_ITEMS, AUDIO_LINKS } from "./constants";
import { cn } from "@/lib/utils";
import { ThemeContext } from "@/app/providers/ThemeProvider";

export function Navbar() {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const theme = useContext(ThemeContext);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

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
  }, [isAudioPlaying]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y === 0) {
        setIsNavVisible(true);
        navContainerRef.current?.classList.remove("floating-nav");
      } else if (y > lastScrollY) {
        setIsNavVisible(false);
        navContainerRef.current?.classList.add("floating-nav");
      } else {
        setIsNavVisible(true);
        navContainerRef.current?.classList.add("floating-nav");
      }
      setLastScrollY(y);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      ref={navContainerRef}
      className={cn(
        "fixed inset-x-0 top-4 z-50 h-16 border-none transition-transform duration-200 ease-out sm:inset-x-6",
        !isNavVisible && "-translate-y-full opacity-0"
      )}
    >
      <div className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          <div className="flex items-center gap-7">
            <a
              href="#hero"
              className={cn(
                "transition hover:opacity-100",
                theme?.isDark
                  ? "drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                  : "drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
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
                className={cn(
                  "ml-10 flex items-center p-2 transition hover:opacity-100",
                  theme?.isDark ? "text-white" : "text-black"
                )}
                title="Toggle Theme"
              >
                {mounted &&
                  (theme?.isDark ? (
                    <Sun size={20} aria-hidden />
                  ) : (
                    <Moon size={20} aria-hidden />
                  ))}
              </button>

              <button
                onClick={toggleAudioIndicator}
                className={cn(
                  "flex items-center space-x-1 p-2 transition hover:opacity-100",
                  theme?.isDark ? "text-white" : "text-black"
                )}
                title="Play Audio"
              >
                <audio
                  ref={audioElementRef}
                  src={AUDIO_LINKS.default}
                  className="hidden"
                  loop
                  preload="none"
                />
                {Array(4)
                  .fill("")
                  .map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "indicator-line",
                        isIndicatorActive && "active",
                        theme?.isDark ? "bg-white" : "bg-black"
                      )}
                      style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    />
                  ))}
              </button>

              <a
                href={LINKS.sourceCode}
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:opacity-100"
                title="Source Code"
              >
                <FaGithub
                  className={cn(
                    "size-5 transition-all duration-300",
                    theme?.isDark ? "text-white" : "text-black"
                  )}
                />
              </a>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
