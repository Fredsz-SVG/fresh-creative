'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, MessageCircle } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [contactHref, setContactHref] = useState<string>("");

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled more than 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/showcase"), { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as unknown;
        const href =
          data && typeof data === "object" && !Array.isArray(data) && typeof (data as any).contactUrl === "string"
            ? String((data as any).contactUrl).trim()
            : "";
        if (!cancelled) setContactHref(href);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const scrollToContact = useCallback(() => {
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleContactClick = useCallback(() => {
    if (contactHref) {
      window.open(contactHref, "_blank", "noopener,noreferrer");
      return;
    }
    scrollToContact();
  }, [contactHref, scrollToContact]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <motion.button
        initial={{ opacity: 0, scale: 0.85, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.08, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleContactClick}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-300 dark:bg-[#0d1148] text-black dark:text-[#5cecff] shadow-[4px_4px_0px_#000] dark:shadow-[0_0_12px_rgba(92,236,255,0.7),0_0_24px_rgba(255,97,198,0.4),4px_4px_0px_#ff61c6] border-2 border-black dark:border-[#5cecff]/60 focus:outline-none transition-all hover:bg-yellow-200 dark:hover:bg-[#131a68] dark:hover:shadow-[0_0_18px_rgba(92,236,255,0.9),0_0_36px_rgba(255,97,198,0.5)]"
        aria-label="Contact us"
      >
        <MessageCircle size={22} strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.92 }}
            onClick={scrollToTop}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-300 dark:bg-[#0d1148] text-black dark:text-[#5cecff] shadow-[4px_4px_0px_#000] dark:shadow-[0_0_12px_rgba(92,236,255,0.7),0_0_24px_rgba(255,97,198,0.4),4px_4px_0px_#ff61c6] border-2 border-black dark:border-[#5cecff]/60 focus:outline-none transition-all hover:bg-yellow-200 dark:hover:bg-[#131a68] dark:hover:shadow-[0_0_18px_rgba(92,236,255,0.9),0_0_36px_rgba(255,97,198,0.5)]"
            aria-label="Scroll to top"
          >
            <ArrowUp size={24} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
