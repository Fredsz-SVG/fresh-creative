'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, ClipboardList, Book, Eye, Lock, Edit3, ChevronLeft } from 'lucide-react'
import { getYearbookSectionQueryUrl } from '../lib/yearbook-paths'

type SectionMode = 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview'

interface IconSidebarProps {
  pathname?: string | null
  albumId: string
  isCoverView: boolean
  sidebarMode: string
  setSidebarMode?: (mode: SectionMode) => void
  setView?: (view: 'cover' | 'classes' | 'gallery') => void
  onSectionChange?: (section: SectionMode) => void
  canManage: boolean
  requestsByClass: Record<string, any[]>
  flipbookAccessible?: boolean
  aiLabsAccessible?: boolean
  loading?: boolean
  backHref?: string
  backLabel?: string
}

const linkClass = (active: boolean) =>
  `flex-shrink-0 flex flex-row items-center gap-4 py-4 px-6 border-b-2 border-black dark:border-slate-700 text-[11px] font-black uppercase tracking-widest transition-all w-full ${active
    ? 'bg-amber-400 dark:bg-amber-600 text-slate-900 dark:text-white'
    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
  }`

function IconSidebarInner({
  pathname = null,
  albumId,
  isCoverView,
  sidebarMode,
  canManage,
  requestsByClass,
  onSectionChange,
  flipbookAccessible = true,
  aiLabsAccessible = true,
  loading = false,
  backHref,
  backLabel,
}: IconSidebarProps) {
  const pendingCount = Object.values(requestsByClass).flat().length
  const url = (mode: Parameters<typeof getYearbookSectionQueryUrl>[1]) => getYearbookSectionQueryUrl(albumId, mode, pathname)

  const handleClick = (section: SectionMode) => (e: React.MouseEvent) => {
    if (onSectionChange) {
      e.preventDefault()
      onSectionChange(section)
    }
  }

  if (loading) return null

  return (
    <div className="hidden lg:fixed lg:left-0 lg:top-14 lg:w-48 lg:h-[calc(100vh-3.5rem)] lg:flex flex-col lg:z-40 lg:bg-white lg:dark:bg-slate-900 lg:border-r-2 lg:border-black lg:dark:border-slate-700 animate-in fade-in slide-in-from-left-4 duration-500">
      {canManage && (
        <a href={url('preview')} className={linkClass(sidebarMode === 'preview')} title="Preview Album" onClick={handleClick('preview')}>
          <Eye className="w-5 h-5" strokeWidth={2.5} />
          <span>Preview</span>
        </a>
      )}
      <a href={url('ai-labs')} className={`relative ${linkClass(sidebarMode === 'ai-labs')}`} title="AI Labs" onClick={handleClick('ai-labs')}>
        <div className="relative flex items-center justify-center">
          <Sparkles className="w-5 h-5" strokeWidth={2.5} />
          {!aiLabsAccessible && (
            <Lock className="w-3 h-3 absolute -top-1.5 -right-1.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 rounded-full p-0.5 border-2 border-black dark:border-slate-700" />
          )}
        </div>
        <span>AI Labs</span>
      </a>
      <a href={url('classes')} className={linkClass((['classes', 'sambutan', 'cover'].includes(sidebarMode) || isCoverView))} title="Edit Konten" onClick={handleClick('classes')}>
        <Edit3 className="w-5 h-5" strokeWidth={2.5} />
        <span>Edit</span>
      </a>
      <a href={url('flipbook')} className={`relative ${linkClass(sidebarMode === 'flipbook')}`} title="Flipbook" onClick={handleClick('flipbook')}>
        <div className="relative flex items-center justify-center">
          <Book className="w-5 h-5" strokeWidth={2.5} />
          {!flipbookAccessible && (
            <Lock className="w-3 h-3 absolute -top-1.5 -right-1.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 rounded-full p-0.5 border-2 border-black dark:border-slate-700" />
          )}
        </div>
        <span>Flipbook</span>
      </a>
      {canManage && (
        <a href={url('approval')} className={`relative ${linkClass(sidebarMode === 'approval')}`} title="Kelola Approval" onClick={handleClick('approval')}>
          <ClipboardList className="w-5 h-5" strokeWidth={2.5} />
          <span>Approval</span>
          {pendingCount > 0 && (
            <span className="absolute top-4 right-4 flex h-3 w-3 rounded-full bg-red-500 border-2 border-black dark:border-slate-700 animate-pulse" />
          )}
        </a>
      )}

      {/* Back to Management Link at the bottom - Distinct UI */}
      {backHref && (
        <div className="mt-auto p-4 bg-slate-50 dark:bg-slate-800/30">
          <Link 
            href={backHref}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 dark:bg-slate-700 border-2 border-black dark:border-slate-600 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0_0_#000] dark:shadow-none hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={4} />
            <span className="truncate">{backLabel || 'Kembali'}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default React.memo(IconSidebarInner)



























