'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Book,
  MessageSquare,
  Sparkles,
  Users,
  X,
  Edit3,
  Lock,
  Plus,
  Check,
  Clock,
  Eye,
  ClipboardList,
  UserCog,
  Trash2,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { getYearbookSectionQueryUrl } from '../lib/yearbook-paths'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number; batch_photo_url?: string | null }
type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }

export interface YearbookMobileNavProps {
  pathname?: string | null
  effectiveAlbumId: string
  isCoverView: boolean
  sidebarMode: string
  canManage: boolean
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
  joinStats: { pending_count?: number } | null
  classes: AlbumClass[]
  classIndex: number
  setClassIndex: any
  myRequestByClass: Record<string, ClassRequest | null>
  membersByClass: Record<string, unknown[]>
  myAccessByClass: Record<string, { status?: string; student_name?: string } | null>
  currentClass: AlbumClass | null
  addingClass: boolean
  setAddingClass: (v: boolean) => void
  handleUpdateClass?: (classId: string, updates: { name?: string, sort_order?: number }) => Promise<unknown>
  setDeleteClassConfirm: (v: { classId: string; className: string } | null) => void
  isOwner?: boolean
  handleJoinAsOwner?: (classId: string) => void
  newClassName?: string
  setNewClassName?: (v: string) => void
  handleAddClass?: () => void
  flipbookAccessible?: boolean
  aiLabsAccessible?: boolean
  flipbookPreviewMode?: boolean
  onSectionChange?: (section: 'cover' | 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview') => void
}

export default function YearbookMobileNav({
  pathname = null,
  effectiveAlbumId,
  isCoverView,
  sidebarMode,
  canManage,
  mobileMenuOpen,
  setMobileMenuOpen,
  joinStats,
  classes,
  classIndex,
  setClassIndex,
  myRequestByClass,
  membersByClass,
  myAccessByClass,
  currentClass,
  addingClass,
  setAddingClass,
  handleUpdateClass,
  setDeleteClassConfirm,
  isOwner = false,
  handleJoinAsOwner,
  newClassName = '',
  setNewClassName,
  handleAddClass,
  flipbookAccessible = true,
  aiLabsAccessible = true,
  flipbookPreviewMode = false,
  onSectionChange,
}: YearbookMobileNavProps) {
  const router = useRouter()
  const [mobileEditingClassId, setMobileEditingClassId] = useState<string | null>(null)
  const [mobileEditNameVal, setMobileEditNameVal] = useState('')
  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false)
  const url = (mode: 'cover' | 'classes' | 'sambutan' | 'ai-labs' | 'preview' | 'flipbook' | 'approval' | 'team') =>
    getYearbookSectionQueryUrl(effectiveAlbumId, mode, pathname)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const aiLabsTool = searchParams?.get('tool')
  const isAiLabsToolActive = sidebarMode === 'ai-labs' && !!aiLabsTool
  const hideBottomNav = isAiLabsToolActive || (sidebarMode === 'flipbook' && (flipbookPreviewMode || !canManage))

  const [bottomNavVisible, setBottomNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const scrollThreshold = 60
    const scrollEndDelay = 400

    const handleScroll = () => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0
      const prev = lastScrollY.current
      lastScrollY.current = y

      if (prev !== undefined) {
        if (y > prev && y > scrollThreshold) {
          setBottomNavVisible(false)
        } else if (y < prev) {
          setBottomNavVisible(true)
        }
      }

      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
      scrollEndTimer.current = setTimeout(() => {
        setBottomNavVisible(true)
        scrollEndTimer.current = null
      }, scrollEndDelay)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
    }
  }, [])

  const handleNavClick = (mode: any) => {
    if (!effectiveAlbumId) return
    if (onSectionChange) {
      onSectionChange(mode)
    } else {
      router.push(getYearbookSectionQueryUrl(effectiveAlbumId, mode, pathname), { scroll: false })
    }
  }

  return (
    <>
      {/* Mobile Bottom Navigation - Preview & Approval langsung di bar, tidak dibungkus Menu Lainnya */}
      {!hideBottomNav && (
        <div className={`fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 border-t-4 border-slate-900 dark:border-slate-700 flex lg:hidden items-center justify-around min-h-[3.5rem] sm:min-h-16 pb-safe safe-area-bottom shadow-[0_-4px_10px_0_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_10px_0_rgba(0,0,0,0.3)] transform transition-transform duration-300 ease-out ${bottomNavVisible ? 'translate-y-0' : 'translate-y-32'}`}>
          {canManage && (
            <button
              onClick={() => handleNavClick('preview')}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 py-1.5 ${sidebarMode === 'preview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" strokeWidth={2.5} />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Preview</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('classes')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 py-1.5 ${(['classes', 'sambutan'].includes(sidebarMode) || isCoverView) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Edit</span>
          </button>

          <div className="flex-1 flex items-center justify-center relative min-w-0 py-1.5">
            <button
              onClick={() => handleNavClick('ai-labs')}
              className={`absolute -top-5 sm:-top-7 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_4px_0_0_#0f172a] sm:shadow-[0_6px_0_0_#0f172a] dark:shadow-[0_4px_0_0_#334155] sm:dark:shadow-[0_6px_0_0_#334155] active:shadow-none active:translate-y-0.5 sm:active:translate-y-1 transition-all border-2 border-slate-900 dark:border-slate-700 ${sidebarMode === 'ai-labs'
                ? 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white'
                : 'bg-indigo-500 text-white'
                }`}
            >
              <div className="relative">
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2.5} />
                {!aiLabsAccessible && (
                  <Lock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 text-slate-900" fill="#fbbf24" strokeWidth={3} />
                )}
              </div>
            </button>
            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-7 sm:mt-9 ${sidebarMode === 'ai-labs' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              AI Labs
            </span>
          </div>

          <button
            onClick={() => handleNavClick('flipbook')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 relative py-1.5 ${sidebarMode === 'flipbook' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <div className="relative">
              <Book className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" strokeWidth={2.5} />
              {!flipbookAccessible && (
                <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 absolute -top-0.5 -right-0.5 text-slate-900" fill="#fbbf24" strokeWidth={3} />
              )}
            </div>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Flipbook</span>
          </button>

          {canManage && (
            <button
              onClick={() => handleNavClick('approval')}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all relative min-w-0 py-1.5 ${sidebarMode === 'approval' || sidebarMode === 'team' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <div className="relative">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" strokeWidth={2.5} />
                {joinStats && joinStats.pending_count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 border-2 border-white" />
                  </span>
                )}
              </div>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate w-full px-0.5">Akses</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Class Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[65] bg-slate-900/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[70] w-3/4 max-w-[280px] bg-white dark:bg-slate-900 border-r-4 border-slate-900 dark:border-slate-700 flex flex-col shadow-2xl lg:hidden animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b-2 border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Daftar Kelas</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white active:bg-slate-50 dark:active:bg-slate-700 transition-all"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {classes.map((c, idx) => {
                const access = myAccessByClass[c.id]
                if (!canManage && access?.status !== 'approved') return null
                const req = myRequestByClass[c.id]
                const hasPendingRequest = req?.status === 'pending'
                const isEditing = mobileEditingClassId === c.id
                const isActive = idx === classIndex

                if (isEditing) {
                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] flex flex-col gap-3 animate-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Edit Nama Kelas</label>
                        <input
                          value={mobileEditNameVal}
                          onChange={(e) => setMobileEditNameVal(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Nama kelas"
                          autoFocus
                        />
                      </div>

                      {handleUpdateClass && (
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1">Urutan Kelas</label>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-1 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] w-fit">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (idx > 0) {
                                  handleUpdateClass(c.id, { sort_order: idx - 1, name: mobileEditNameVal })
                                }
                              }}
                              disabled={idx === 0}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-20"
                            >
                              <span className="text-xl leading-none font-bold -mt-0.5">-</span>
                            </button>
                            <div className="px-2 text-center min-w-[40px]">
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{idx + 1}</span>
                              <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black tracking-tighter">/{classes.length}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (idx < classes.length - 1) {
                                  handleUpdateClass(c.id, { sort_order: idx + 1, name: mobileEditNameVal })
                                }
                              }}
                              disabled={idx >= classes.length - 1}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-20"
                            >
                              <Plus className="w-4 h-4" strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!mobileEditNameVal.trim() || !handleUpdateClass) return
                            handleUpdateClass(c.id, { name: mobileEditNameVal })
                            setMobileEditingClassId(null)
                          }}
                          className="flex-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setMobileEditingClassId(null)}
                          className="flex-1 bg-white text-slate-500 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border-2 border-slate-900"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={c.id}
                    className={`relative flex items-center gap-2 p-1.5 rounded-2xl border-2 transition-all ${isActive ? 'bg-amber-300 dark:bg-amber-700 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] -translate-y-0.5' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                  >
                    <button
                      onClick={() => {
                        const ownerRegisteredIn = isOwner
                          ? Object.entries(myAccessByClass).find(([, a]) => a?.status === 'approved')?.[0]
                          : null
                        const ownerRegisteredClassName = ownerRegisteredIn != null ? classes.find((x) => x.id === ownerRegisteredIn)?.name ?? '' : ''
                        if (isOwner && ownerRegisteredIn && ownerRegisteredIn !== c.id) {
                          toast.info(`Anda sudah terdaftar di kelas lain: ${ownerRegisteredClassName}`)
                        }
                        setClassIndex(idx)
                        if (effectiveAlbumId && typeof window !== 'undefined') {
                          const nativePushState = window.history.constructor.prototype.pushState
                          nativePushState.call(window.history, null, '', url('classes'))
                        }
                        setMobileMenuOpen(false)
                      }}
                      className="flex-1 p-2 text-left min-w-0"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-black uppercase tracking-tight truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{c.name}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" strokeWidth={4} />}
                      </div>
                      {hasPendingRequest ? (
                        <div className="flex items-center gap-1 py-0.5 px-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg w-fit">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" strokeWidth={3} />
                          <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-tighter">Tertunda</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users className={`w-3 h-3 ${isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={2.5} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                            {(membersByClass[c.id]?.length ?? 0)} ANGGOTA
                          </span>
                        </div>
                      )}
                    </button>
                    {canManage && (
                      <div className="flex items-center gap-1.5 pr-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMobileEditingClassId(c.id)
                            setMobileEditNameVal(c.name)
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 dark:border-slate-700 active:scale-90 transition-all ${isActive ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-900 dark:text-white" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteClassConfirm({ classId: c.id, className: c.name })
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 dark:border-slate-700 active:scale-90 transition-all ${isActive ? 'bg-white dark:bg-slate-800 text-red-500' : 'bg-red-50 dark:bg-red-950/50 text-red-500'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Section */}
            <div className="mt-auto p-4 border-t-4 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-4">
              {/* Profile Status */}
              {!addingClass && currentClass && myAccessByClass[currentClass.id]?.status === 'approved' && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col gap-1.5">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Status Anda:</p>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={4} />
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-tight truncate">{myAccessByClass[currentClass.id]?.student_name}</span>
                  </div>
                </div>
              )}

              {/* Owner Join Button */}
              {isOwner && currentClass && !myAccessByClass[currentClass.id] && (
                <div className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] space-y-3">
                  {(() => {
                    const hasAccessInOtherClass = Object.entries(myAccessByClass).some(
                      ([classId, classAccess]) =>
                        classId !== currentClass.id &&
                        classAccess &&
                        typeof classAccess === 'object' &&
                        'status' in classAccess &&
                        classAccess.status === 'approved'
                    )

                    if (hasAccessInOtherClass) {
                      const otherEntry = Object.entries(myAccessByClass).find(
                        ([classId, a]) => classId !== currentClass.id && a?.status === 'approved'
                      )
                      const otherClassName = otherEntry ? classes.find((c) => c.id === otherEntry[0])?.name ?? '' : ''
                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest">
                            <Clock className="w-4 h-4" strokeWidth={3} />
                            <span>Batas Pendaftaran</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[9px] font-bold leading-tight uppercase tracking-tight">
                            Anda sudah terdaftar di kelas lain{otherClassName ? `: ${otherClassName}` : ''}. Hanya bisa daftar di 1 kelas.
                          </p>
                        </div>
                      )
                    }

                    return (
                        <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl border-2 border-slate-900 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                            <UserCog className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-0.5">Owner Album</h3>
                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-tight">
                              Anda owner album. Daftar di kelas ini.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setJoinConfirmOpen(true)}
                          className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-indigo-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:shadow-[4px_4px_0_0_#334155] dark:hover:shadow-[4px_4px_0_0_#334155] active:translate-y-0.5 transition-all border-2 border-slate-900 dark:border-slate-700"
                        >
                          Daftar di Kelas
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Add Class Area */}
              {canManage && (
                <div className="w-full">
                  {!addingClass ? (
                    <button
                      onClick={() => setAddingClass(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest active:translate-y-0.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" strokeWidth={3} />
                      Nama kelas
                    </button>
                  ) : (
                    <div className="p-4 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] animate-in slide-in-from-bottom-2 duration-200">
                      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Tambah Kelas Baru</label>
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName && setNewClassName(e.target.value)}
                        placeholder="Contoh: XII IPA 1"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all mb-3 dark:placeholder:text-slate-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (handleAddClass && newClassName.trim()) {
                              handleAddClass()
                            }
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (handleAddClass && newClassName.trim()) {
                              handleAddClass()
                            }
                          }}
                          disabled={!newClassName.trim()}
                          className="flex-1 py-3 rounded-xl bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-700 disabled:opacity-50 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingClass(false)
                            if (setNewClassName) setNewClassName('')
                          }}
                          className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-700"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Konfirmasi daftar kelas (owner) */}
      {joinConfirmOpen && currentClass && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Daftar di Kelas</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Yakin daftar di kelas ini? Anda hanya bisa terdaftar di 1 kelas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setJoinConfirmOpen(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (handleJoinAsOwner) handleJoinAsOwner(currentClass.id)
                  setJoinConfirmOpen(false)
                  setMobileMenuOpen(false)
                }}
                className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-white border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Daftar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
