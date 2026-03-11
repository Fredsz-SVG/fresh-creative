'use client'

import React, { useState } from 'react'
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
}: YearbookMobileNavProps) {
  const router = useRouter()
  const [mobileEditingClassId, setMobileEditingClassId] = useState<string | null>(null)
  const [mobileEditNameVal, setMobileEditNameVal] = useState('')
  const url = (mode: 'cover' | 'classes' | 'sambutan' | 'ai-labs' | 'preview' | 'flipbook' | 'approval' | 'team') =>
    getYearbookSectionQueryUrl(effectiveAlbumId, mode, pathname)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const aiLabsTool = searchParams?.get('tool')
  const isAiLabsToolActive = sidebarMode === 'ai-labs' && !!aiLabsTool
  const hideBottomNav = isAiLabsToolActive || (sidebarMode === 'flipbook' && flipbookPreviewMode)

  return (
    <>
      {/* Mobile Bottom Navigation - Preview & Approval langsung di bar, tidak dibungkus Menu Lainnya */}
      {!hideBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t-4 border-slate-900 flex lg:hidden items-center justify-around h-16 pb-safe safe-area-bottom shadow-[0_-4px_10px_0_rgba(0,0,0,0.1)]">
          <button
            onClick={() => {
              router.push(getYearbookSectionQueryUrl(effectiveAlbumId!, 'classes', pathname), { scroll: false })
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 ${(['classes', 'sambutan'].includes(sidebarMode) || isCoverView) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <Edit3 className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Edit</span>
          </button>

          <button
            onClick={() => effectiveAlbumId && router.push(url('preview'), { scroll: false })}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 ${sidebarMode === 'preview' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <Eye className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Preview</span>
          </button>

          <div className="flex-1 flex items-center justify-center relative min-w-0">
            <button
              onClick={() => effectiveAlbumId && router.push(url('ai-labs'), { scroll: false })}
              className={`absolute -top-7 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_6px_0_0_#0f172a] active:shadow-none active:translate-y-1 transition-all border-4 border-slate-900 ${sidebarMode === 'ai-labs'
                ? 'bg-amber-300 text-slate-900'
                : 'bg-indigo-500 text-white'
                }`}
            >
              <div className="relative">
                <Sparkles className="w-7 h-7" strokeWidth={2.5} />
                {!aiLabsAccessible && (
                  <Lock className="w-3.5 h-3.5 absolute -top-1 -right-1 text-slate-900" fill="#fbbf24" strokeWidth={3} />
                )}
              </div>
            </button>
            <span className={`text-[9px] font-black uppercase tracking-widest mt-9 ${sidebarMode === 'ai-labs' ? 'text-indigo-600' : 'text-slate-400'}`}>
              AI Labs
            </span>
          </div>

          <button
            onClick={() => effectiveAlbumId && router.push(url('flipbook'), { scroll: false })}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all min-w-0 relative ${sidebarMode === 'flipbook' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="relative">
              <Book className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
              {!flipbookAccessible && (
                <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-slate-900" fill="#fbbf24" strokeWidth={3} />
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-center truncate w-full px-0.5">Flipbook</span>
          </button>

          {canManage ? (
            <button
              onClick={() => effectiveAlbumId && router.push(url('approval'), { scroll: false })}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-95 transition-all relative min-w-0 ${sidebarMode === 'approval' || sidebarMode === 'team' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
            >
              <div className="relative">
                <ClipboardList className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
                {joinStats && joinStats.pending_count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white" />
                  </span>
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest truncate w-full px-0.5">Akses</span>
            </button>
          ) : (
            <div className="flex-1 min-w-0" aria-hidden />
          )}
        </div>
      )}

      {/* Mobile Class Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[65] bg-slate-900/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[70] w-3/4 max-w-[280px] bg-white border-r-4 border-slate-900 flex flex-col shadow-2xl lg:hidden animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b-2 border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Daftar Kelas</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-slate-900 active:bg-slate-50 transition-all"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {classes.map((c, idx) => {
                const req = myRequestByClass[c.id]
                const hasPendingRequest = req?.status === 'pending'
                const isEditing = mobileEditingClassId === c.id
                const isActive = idx === classIndex

                if (isEditing) {
                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-amber-50 border-4 border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex flex-col gap-3 animate-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Edit Nama Kelas</label>
                        <input
                          value={mobileEditNameVal}
                          onChange={(e) => setMobileEditNameVal(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-slate-900 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Nama kelas"
                          autoFocus
                        />
                      </div>

                      {handleUpdateClass && (
                        <div className="flex flex-col gap-1.5 w-full">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1">Urutan Kelas</label>
                          <div className="flex items-center gap-1.5 bg-white border-2 border-slate-900 rounded-xl p-1 shadow-[2px_2px_0_0_#0f172a] w-fit">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (idx > 0) {
                                  // Update order immediately
                                  handleUpdateClass(c.id, { sort_order: idx - 1, name: mobileEditNameVal })
                                }
                              }}
                              disabled={idx === 0}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-900 disabled:opacity-20"
                            >
                              <span className="text-xl leading-none font-bold -mt-0.5">-</span>
                            </button>
                            <div className="px-2 text-center min-w-[40px]">
                              <span className="text-sm font-black text-indigo-600">{idx + 1}</span>
                              <span className="text-[10px] text-slate-300 font-black tracking-tighter">/{classes.length}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (idx < classes.length - 1) {
                                  // Update order immediately
                                  handleUpdateClass(c.id, { sort_order: idx + 1, name: mobileEditNameVal })
                                }
                              }}
                              disabled={idx >= classes.length - 1}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-900 disabled:opacity-20"
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
                          className="flex-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
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
                    className={`relative flex items-center gap-2 p-1.5 rounded-2xl border-2 transition-all ${isActive ? 'bg-amber-300 border-slate-900 shadow-[4px_4px_0_0_#0f172a] -translate-y-0.5' : 'hover:bg-slate-50 border-slate-100'}`}
                  >
                    <button
                      onClick={() => {
                        setClassIndex(idx)
                        if (effectiveAlbumId) router.push(url('classes'), { scroll: false })
                        setMobileMenuOpen(false)
                      }}
                      className="flex-1 p-2 text-left min-w-0"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-black uppercase tracking-tight truncate ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{c.name}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-slate-900" strokeWidth={4} />}
                      </div>
                      {hasPendingRequest ? (
                        <div className="flex items-center gap-1 py-0.5 px-1.5 bg-amber-100 rounded-lg w-fit">
                          <Clock className="w-3 h-3 text-amber-600" strokeWidth={3} />
                          <span className="text-[9px] font-black text-amber-700 uppercase tracking-tighter">Tertunda</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users className={`w-3 h-3 ${isActive ? 'text-slate-700' : 'text-slate-400'}`} strokeWidth={2.5} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
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
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 active:scale-90 transition-all ${isActive ? 'bg-white' : 'bg-slate-100'}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-900" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteClassConfirm({ classId: c.id, className: c.name })
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-900 active:scale-90 transition-all ${isActive ? 'bg-white text-red-500' : 'bg-red-50 text-red-500'}`}
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
            <div className="mt-auto p-4 border-t-4 border-slate-900 bg-slate-50 space-y-4">
              {/* Profile Status */}
              {!addingClass && currentClass && myAccessByClass[currentClass.id]?.status === 'approved' && (
                <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex flex-col gap-1.5">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Status Anda:</p>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600" strokeWidth={4} />
                    <span className="text-xs font-black text-indigo-700 uppercase tracking-tight truncate">{myAccessByClass[currentClass.id]?.student_name}</span>
                  </div>
                </div>
              )}

              {/* Owner Join Button */}
              {isOwner && currentClass && !myAccessByClass[currentClass.id] && (
                <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0_0_#0f172a] space-y-3">
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
                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                            <Clock className="w-4 h-4" strokeWidth={3} />
                            <span>Batas Pendaftaran</span>
                          </div>
                          <p className="text-slate-500 text-[9px] font-bold leading-tight uppercase tracking-tight">
                            Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-indigo-100 rounded-xl border-2 border-slate-900 text-indigo-600">
                            <UserCog className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-0.5">Akses Owner</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase leading-tight tracking-tight">
                              Daftar Sekarang untuk kelola foto profil.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (handleJoinAsOwner) handleJoinAsOwner(currentClass.id)
                            setMobileMenuOpen(false)
                          }}
                          className="w-full py-3 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[4px_4px_0_0_#0f172a] active:translate-y-0.5 transition-all border-2 border-slate-900"
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
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-widest active:translate-y-0.5 transition-all hover:bg-slate-50"
                    >
                      <Plus className="w-4.5 h-4.5" strokeWidth={3} />
                      Nama kelas
                    </button>
                  ) : (
                    <div className="p-4 bg-white border-4 border-slate-900 rounded-2xl shadow-[6px_6px_0_0_#0f172a] animate-in slide-in-from-bottom-2 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tambah Kelas Baru</label>
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName && setNewClassName(e.target.value)}
                        placeholder="Contoh: XII IPA 1"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-900 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white transition-all mb-3"
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
                          className="flex-1 py-3 rounded-xl bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 disabled:opacity-50 shadow-[3px_3px_0_0_#0f172a] active:shadow-none"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingClass(false)
                            if (setNewClassName) setNewClassName('')
                          }}
                          className="flex-1 py-3 rounded-xl bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900"
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


    </>
  )
}
