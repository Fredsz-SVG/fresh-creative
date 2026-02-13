'use client'

import { BookOpen, Users, ClipboardList, Shield, MessageSquare, Sparkles } from 'lucide-react'

interface IconSidebarProps {
  isCoverView: boolean
  sidebarMode: string
  setSidebarMode: (mode: string) => void
  setView: (view: string) => void
  canManage: boolean
  requestsByClass: Record<string, any[]>
}

export default function IconSidebar({
  isCoverView,
  sidebarMode,
  setSidebarMode,
  setView,
  canManage,
  requestsByClass,
}: IconSidebarProps) {
  return (
    <div className="hidden lg:fixed lg:left-0 lg:top-12 lg:w-16 lg:h-[calc(100vh-48px)] lg:flex flex-col lg:z-40 lg:bg-black/40 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
      <button
        type="button"
        onClick={() => {
          setSidebarMode('ai-labs')
          if (isCoverView) setView('classes')
        }}
        className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${sidebarMode === 'ai-labs'
          ? 'bg-lime-600/20 text-lime-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        title="AI Labs"
      >
        <Sparkles className="w-6 h-6" />
        <span className="text-[10px]">AI Labs</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setView('cover')
          setSidebarMode('classes')
        }}
        className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${isCoverView
          ? 'bg-lime-600/20 text-lime-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        title="Sampul Album"
      >
        <BookOpen className="w-6 h-6" />
        <span className="text-[10px]">Sampul</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setSidebarMode('classes')
          if (isCoverView) setView('classes')
        }}
        className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${sidebarMode === 'classes' && !isCoverView
          ? 'bg-lime-600/20 text-lime-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        title="Daftar Group"
      >
        <Users className="w-6 h-6" />
        <span className="text-[10px]">Groups</span>
      </button>

      {canManage && (
        <>
          <button
            type="button"
            onClick={() => {
              setSidebarMode('sambutan')
              if (isCoverView) setView('classes')
            }}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${sidebarMode === 'sambutan'
              ? 'bg-lime-600/20 text-lime-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            title="Sambutan"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px]">Sambutan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSidebarMode('approval')
              if (isCoverView) setView('classes')
            }}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors relative ${sidebarMode === 'approval'
              ? 'bg-lime-600/20 text-lime-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            title="Approval"
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-[10px]">Approval</span>
            {Object.values(requestsByClass).flat().length > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setSidebarMode('team')
              if (isCoverView) setView('classes')
            }}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${sidebarMode === 'team'
              ? 'bg-lime-600/20 text-lime-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            title="Team Management"
          >
            <Shield className="w-6 h-6" />
            <span className="text-[10px]">Team</span>
          </button>
        </>
      )}
    </div>
  )
}
