"use client"

import { createContext, useEffect, useState, ReactNode } from 'react'
import { Sun, Moon } from 'lucide-react'

export type ThemeContextType = {
  isDark: boolean
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    const urlParams = new URL(window.location.href).searchParams
    const urlTheme = urlParams.get('theme')
    const saved = localStorage.getItem('theme')
    
    if (urlTheme === 'dark' || urlTheme === 'light') {
      const isUrlDark = urlTheme === 'dark'
      setIsDark(isUrlDark)
      applyTheme(isUrlDark)
    } else if (saved === 'dark' || saved === 'light') {
      const isSavedDark = saved === 'dark'
      setIsDark(isSavedDark)
      applyTheme(isSavedDark)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
      applyTheme(true)
    }
  }, [])

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
