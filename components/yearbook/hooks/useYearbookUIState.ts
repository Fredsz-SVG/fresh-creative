import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useYearbookUIState(id: string | undefined) {
  const router = useRouter()

  const [view, setView] = useState<'cover' | 'classes' | 'gallery'>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-view-${id}`)
      return (saved as 'cover' | 'classes' | 'gallery') || 'cover'
    }
    return 'cover'
  })

  const [classIndex, setClassIndex] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-classIndex-${id}`)
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })

  const [sidebarMode, setSidebarMode] = useState<'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview'>('classes')
  const [classViewMode, setClassViewMode] = useState<'list' | 'personal'>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-classViewMode-${id}`)
      return (saved as 'list' | 'personal') || 'personal'
    }
    return 'personal'
  })

  const [personalIndex, setPersonalIndex] = useState(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-personalIndex-${id}`)
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })

  const [flipbookPreviewMode, setFlipbookPreviewMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastEditorSection, setLastEditorSection] = useState<string | null>(null)

  // Persist view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-view-${id}`, view)
    }
  }, [view, id])

  // Persist classIndex to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-classIndex-${id}`, String(classIndex))
    }
  }, [classIndex, id])

  // Persist classViewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-classViewMode-${id}`, classViewMode)
    }
  }, [classViewMode, id])

  // Persist personalIndex to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-personalIndex-${id}`, String(personalIndex))
    }
  }, [personalIndex, id])

  // Persist sidebarMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-sidebarMode-${id}`, sidebarMode)
    }
  }, [sidebarMode, id])

  return {
    view,
    setView,
    classIndex,
    setClassIndex,
    sidebarMode,
    setSidebarMode,
    classViewMode,
    setClassViewMode,
    personalIndex,
    setPersonalIndex,
    flipbookPreviewMode,
    setFlipbookPreviewMode,
    mobileMenuOpen,
    setMobileMenuOpen,
    lastEditorSection,
    setLastEditorSection
  }
}
