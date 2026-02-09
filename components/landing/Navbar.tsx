'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'

export default function Navbar() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const initialIsDark = (() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
      if (saved) return saved === 'dark'
      if (typeof document !== 'undefined') {
        const ds = document.documentElement.dataset.theme
        if (ds) return ds === 'dark'
      }
      if (typeof window !== 'undefined') return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {}
    return true
  })()

  const [isDark, setIsDark] = useState<boolean>(initialIsDark)

  // Ensure DOM reflects initial theme synchronously
  try { applyTheme(initialIsDark) } catch {}

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

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    applyTheme(next)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    })
    setIsMobileMenuOpen(false) // Close mobile menu after clicking
  }

  const handleGetStarted = async () => {
    setIsMobileMenuOpen(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const role = await getRole(supabase, session.user)
      router.push(role === 'admin' ? '/admin' : '/user')
    } else {
      router.push('/login')
    }
  }

  return (
    <header className="landing-header">
      <div className="landing-header__container">
        {/* Logo */}
        <div
          className="landing-header__logo"
          onClick={() => scrollTo('hero')}
        >
          Fresh Creative
        </div>

        {/* Desktop Menu — AI Labs hanya di dashboard user/admin */}
        <nav className="landing-header__nav">
          <button onClick={() => scrollTo('features')}>Features</button>
          <button onClick={() => scrollTo('about')}>About</button>
          <button onClick={() => scrollTo('cta')}>Contact</button>
        </nav>

        {/* Right Side: Desktop Actions + Theme Toggle + Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Desktop Actions */}
          <div className="landing-header__actions hidden md:flex">
            <button
              onClick={handleGetStarted}
              className="landing-header__cta"
            >
              Get Started
            </button>
          </div>

          {/* Theme Toggle Button (render immediately) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            type="button"
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Menu Button - Hamburger (3 strips) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            type="button"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col p-4 space-y-2">
            <button
              onClick={() => scrollTo('features')}
              className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('about')}
              className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              About
            </button>
            <button
              onClick={() => scrollTo('cta')}
              className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Contact
            </button>
            <button
              onClick={handleGetStarted}
              className="mt-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
