"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  // sumber utama: dataset (di-set dari script di <head>)
  const t = document.documentElement.dataset.theme;
  return t === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  // 1) dataset + color-scheme (buat CSS variables / native form controls)
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  // 2) Tailwind dark mode (dark:*)
  document.documentElement.classList.toggle("dark", theme === "dark");

  // 3) persist
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof document !== 'undefined') {
        const t = document.documentElement.dataset.theme
        return t === 'light' ? 'light' : 'dark'
      }
    } catch {}
    return 'dark'
  })

  useEffect(() => {
    // ensure class reflects theme
    try { document.documentElement.classList.toggle('dark', theme === 'dark') } catch {}
  }, [theme])

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="px-3 py-2 rounded-lg border border-app bg-card text-sm text-app hover:opacity-90"
      aria-label="Toggle theme"
    >
  <span className="inline dark:hidden">☀️ Light</span>
  <span className="hidden dark:inline">🌙 Dark</span>
    </button>
  );
}
