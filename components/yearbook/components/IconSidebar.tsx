'use client'

import Link from 'next/link'
import { BookOpen, Users, ClipboardList, UserCog, MessageSquare, Sparkles, Book, Eye } from 'lucide-react'
import { getYearbookSectionQueryUrl } from '../lib/yearbook-paths'

interface IconSidebarProps {
  pathname?: string | null
  albumId: string
  isCoverView: boolean
  sidebarMode: string
  setSidebarMode: (mode: 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview') => void
  setView: (view: 'cover' | 'classes' | 'gallery') => void
  canManage: boolean
  requestsByClass: Record<string, any[]>
}

const linkClass = (active: boolean) =>
  `flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors w-full ${
    active ? 'bg-lime-600/20 text-lime-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
  }`

export default function IconSidebar({
  pathname = null,
  albumId,
  isCoverView,
  sidebarMode,
  canManage,
  requestsByClass,
}: IconSidebarProps) {
  const pendingCount = Object.values(requestsByClass).flat().length
  const url = (mode: Parameters<typeof getYearbookSectionQueryUrl>[1]) => getYearbookSectionQueryUrl(albumId, mode, pathname)

  return (
    <div className="hidden lg:fixed lg:left-0 lg:top-14 lg:w-16 lg:h-[calc(100vh-3.5rem)] lg:flex flex-col lg:z-40 lg:bg-black/40 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
      <Link href={url('preview')} prefetch={false} className={linkClass(sidebarMode === 'preview')} title="Preview Album">
        <Eye className="w-6 h-6" />
        <span className="text-[10px]">Preview</span>
      </Link>
      <Link prefetch={false} href={url('ai-labs')} className={linkClass(sidebarMode === 'ai-labs')} title="AI Labs">
        <Sparkles className="w-6 h-6" />
        <span className="text-[10px]">AI Labs</span>
      </Link>
      <Link prefetch={false} href={url('cover')} className={linkClass(isCoverView)} title="Sampul Album">
        <BookOpen className="w-6 h-6" />
        <span className="text-[10px]">Sampul</span>
      </Link>

      {canManage && (
        <Link prefetch={false} href={url('sambutan')} className={linkClass(sidebarMode === 'sambutan')} title="Sambutan Guru">
          <MessageSquare className="w-6 h-6" />
          <span className="text-[10px]">Sambutan</span>
        </Link>
      )}

      <Link prefetch={false} href={url('classes')} className={linkClass(sidebarMode === 'classes' && !isCoverView)} title="Daftar Kelas">
        <Users className="w-6 h-6" />
        <span className="text-[10px]">Kelas</span>
      </Link>

      <Link prefetch={false} href={url('flipbook')} className={linkClass(sidebarMode === 'flipbook')} title="Flipbook">
        <Book className="w-6 h-6" />
        <span className="text-[10px]">Flipbook</span>
      </Link>

      {canManage && (
        <>
          <Link prefetch={false} href={url('approval')} className={`relative ${linkClass(sidebarMode === 'approval')}`} title="Kelola Akses">
            <ClipboardList className="w-6 h-6" />
            <span className="text-[10px]">Akses</span>
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
          <Link prefetch={false} href={url('team')} className={linkClass(sidebarMode === 'team')} title="Kelola Tim">
            <UserCog className="w-6 h-6" />
            <span className="text-[10px]">Tim</span>
          </Link>
        </>
      )}
    </div>
  )
}
