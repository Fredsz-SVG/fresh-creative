"use client"

import { createContext, useEffect, useState, ReactNode } from 'react'
import { Sun, Moon } from 'lucide-react'

export type ThemeContextType = {
  isDark: boolean
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const initialIsDark = (() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
      if (saved) return saved === 'dark'
      if (typeof window !== 'undefined') return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {}
    return true
  })()

  const [isDark, setIsDark] = useState<boolean>(initialIsDark)

  // Ensure DOM reflects initial theme synchronously for consumers that mount immediately
  try { applyTheme(initialIsDark) } catch {}

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement

  if (isDark) {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
}
