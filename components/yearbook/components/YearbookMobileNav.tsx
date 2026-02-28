'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  MessageSquare,
  Sparkles,
  Users,
  Menu,
  X,
  Edit3,
  Plus,
  Check,
  Clock,
  Eye,
  Book,
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
  moreMenuOpen: boolean
  setMoreMenuOpen: (v: boolean) => void
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
  handleUpdateClass?: (classId: string, updates: { name?: string }) => Promise<unknown>
  setDeleteClassConfirm: (v: { classId: string; className: string } | null) => void
  isOwner?: boolean
  handleJoinAsOwner?: (classId: string) => void
  newClassName?: string
  setNewClassName?: (v: string) => void
  handleAddClass?: () => void
}

export default function YearbookMobileNav({
  pathname = null,
  effectiveAlbumId,
  isCoverView,
  sidebarMode,
  canManage,
  mobileMenuOpen,
  setMobileMenuOpen,
  moreMenuOpen,
  setMoreMenuOpen,
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
}: YearbookMobileNavProps) {
  const router = useRouter()
  const [mobileEditingClassId, setMobileEditingClassId] = useState<string | null>(null)
  const [mobileEditNameVal, setMobileEditNameVal] = useState('')
  const url = (mode: 'cover' | 'classes' | 'sambutan' | 'ai-labs' | 'preview' | 'flipbook' | 'approval' | 'team') =>
    getYearbookSectionQueryUrl(effectiveAlbumId, mode, pathname)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const aiLabsTool = searchParams?.get('tool')
  const isAiLabsToolActive = sidebarMode === 'ai-labs' && !!aiLabsTool

  return (
    <>
      {/* Mobile Bottom Navigation */}
      {!isAiLabsToolActive && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0a0a0b] border-t border-white/10 flex lg:hidden items-center justify-around h-16 pb-safe safe-area-bottom shadow-2xl">
        <button
          onClick={() => effectiveAlbumId && router.push(url('cover'), { scroll: false })}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${isCoverView ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sampul</span>
        </button>
        {canManage && (
          <button
            onClick={() => effectiveAlbumId && router.push(url('sambutan'), { scroll: false })}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${sidebarMode === 'sambutan' ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sambutan</span>
          </button>
        )}

        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={() => effectiveAlbumId && router.push(url('ai-labs'), { scroll: false })}
            className={`absolute -top-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all border-4 ${sidebarMode === 'ai-labs'
              ? 'bg-lime-600 border-lime-500 text-white shadow-lime-500/50'
              : 'bg-gray-800 border-[#0a0a0b] text-gray-400 lg:hover:text-white lg:hover:bg-gray-700'
              }`}
          >
            <Sparkles className="w-6 h-6" />
          </button>
          <span className={`text-[10px] font-medium mt-8 ${sidebarMode === 'ai-labs' ? 'text-lime-400' : 'text-gray-500'}`}>
            AI Labs
          </span>
        </div>

        <button
          onClick={() => effectiveAlbumId && router.push(url('classes'))}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${sidebarMode === 'classes' && !isCoverView ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Kelas</span>
        </button>

        {canManage && (
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform relative ${['approval', 'team'].includes(sidebarMode) ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {joinStats && joinStats.pending_count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Lainnya</span>
          </button>
        )}
        </div>
      )}

      {/* Mobile Class Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[70] w-3/4 max-w-xs bg-[#0a0a0b] border-r border-white/10 flex flex-col shadow-2xl lg:hidden animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">Daftar Kelas</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {classes.map((c, idx) => {
                const req = myRequestByClass[c.id]
                const hasPendingRequest = req?.status === 'pending'
                const isEditing = mobileEditingClassId === c.id

                if (isEditing) {
                  return (
                    <div key={c.id} className="p-2 rounded-xl bg-white/5 border border-lime-500/50 flex flex-col gap-2">
                      <input
                        value={mobileEditNameVal}
                        onChange={(e) => setMobileEditNameVal(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm focus:outline-none focus:border-lime-500 transition-colors"
                        placeholder="Nama kelas"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!mobileEditNameVal.trim() || !handleUpdateClass) return
                            handleUpdateClass(c.id, { name: mobileEditNameVal })
                            setMobileEditingClassId(null)
                          }}
                          className="flex-1 bg-lime-600 hover:bg-lime-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setMobileEditingClassId(null)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold py-2 rounded-lg transition-colors border border-white/10"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={c.id} className={`group flex items-center gap-1 p-1 rounded-xl transition-all ${idx === classIndex ? 'bg-lime-900/10 border border-lime-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                    <button
                      onClick={() => {
                        setClassIndex(idx)
                        if (effectiveAlbumId) router.push(url('classes'), { scroll: false })
                        setMobileMenuOpen(false)
                      }}
                      className="flex-1 p-2 text-left text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`truncate font-medium ${idx === classIndex ? 'text-lime-400' : 'text-gray-300'}`}>{c.name}</span>
                      </div>
                      {hasPendingRequest ? (
                        <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> menunggu persetujuan</p>
                      ) : (
                        <p className="text-xs text-muted mt-0.5">{(membersByClass[c.id]?.length ?? 0)} anggota</p>
                      )}
                    </button>
                    {canManage && (
                      <div className="flex items-center gap-1 pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMobileEditingClassId(c.id)
                            setMobileEditNameVal(c.name)
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteClassConfirm({ classId: c.id, className: c.name })
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!addingClass && currentClass && myAccessByClass[currentClass.id]?.status === 'approved' && (
              <div className="p-3 border-t border-white/10 bg-white/5 mx-2 mb-2 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Status:</p>
                <p className="text-xs font-medium text-lime-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  {myAccessByClass[currentClass.id]?.student_name}
                </p>
              </div>
            )}

            {/* Owner Join Button in Mobile Sidebar */}
            {isOwner && currentClass && !myAccessByClass[currentClass.id] && (
              <div className="p-3 border-t border-white/10 mx-2 mb-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                {(() => {
                  // Check if already registered in another class
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
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                          <Clock className="w-4 h-4" />
                          <span>Batas Pendaftaran</span>
                        </div>
                        <p className="text-gray-400 text-[10px] leading-tight">
                          Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                          <UserCog className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-blue-400">Akses Owner Album</h3>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                            Daftar di kelas ini untuk upload foto profil.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (handleJoinAsOwner) handleJoinAsOwner(currentClass.id)
                          setMobileMenuOpen(false)
                        }}
                        className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                      >
                        Daftar di Kelas Ini
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="p-3 pb-8 border-t border-white/10 flex flex-col gap-2 bg-[#0a0a0b]">
              {canManage && (
                <>
                  {!addingClass ? (
                    <button
                      onClick={() => {
                        setAddingClass(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-lime-600 text-white text-sm font-medium active:scale-95 transition-transform shadow-lg shadow-lime-900/20"
                    >
                      <Plus className="w-4 h-4" />
                      Nama kelas
                    </button>
                  ) : (
                    // In-sidebar add class form
                    <div className="p-3 bg-white/5 border border-lime-500/50 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
                      <h3 className="text-xs font-semibold text-lime-400 mb-2 flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Kelas
                      </h3>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={newClassName}
                          onChange={(e) => setNewClassName && setNewClassName(e.target.value)}
                          placeholder="Nama kelas baru..."
                          className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-sm text-app focus:outline-none focus:border-lime-500 transition-colors"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (handleAddClass && newClassName.trim()) {
                                handleAddClass()
                              }
                            }
                          }}
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (handleAddClass && newClassName.trim()) {
                                handleAddClass()
                              }
                            }}
                            disabled={!newClassName.trim()}
                            className="flex-1 py-2 rounded-lg bg-lime-600 text-white text-xs font-bold hover:bg-lime-500 disabled:opacity-50 transition-all active:scale-95"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingClass(false)
                              if (setNewClassName) setNewClassName('')
                            }}
                            className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile "Lainnya" Drawer */}
      {moreMenuOpen && (
        <>
          <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setMoreMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[70] w-3/4 max-w-xs bg-[#0a0a0b] border-l border-white/10 flex flex-col shadow-2xl lg:hidden animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">Menu Lainnya</h2>
              <button onClick={() => setMoreMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Administrasi Album</p>

              <button
                onClick={() => {
                  if (effectiveAlbumId) router.push(url('preview'), { scroll: false })
                  setMoreMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${sidebarMode === 'preview'
                  ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <div className={`p-2 rounded-lg ${sidebarMode === 'preview' ? 'bg-lime-500/20' : 'bg-white/5'}`}>
                  <Eye className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Preview</p>
                  <p className="text-[10px] text-gray-500">Lihat hasil album publik</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (effectiveAlbumId) router.push(url('flipbook'), { scroll: false })
                  setMoreMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${sidebarMode === 'flipbook'
                  ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <div className={`p-2 rounded-lg ${sidebarMode === 'flipbook' ? 'bg-lime-500/20' : 'bg-white/5'}`}>
                  <Book className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Flipbook</p>
                  <p className="text-[10px] text-gray-500">Baca buku tahunan digital</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (effectiveAlbumId) router.push(url('approval'))
                  setMoreMenuOpen(false)
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${sidebarMode === 'approval'
                  ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sidebarMode === 'approval' ? 'bg-lime-500/20' : 'bg-white/5'}`}>
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Kelola Akses</p>
                    <p className="text-[10px] text-gray-500">Persetujuan pendaftaran siswa</p>
                  </div>
                </div>
                {joinStats && joinStats.pending_count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {joinStats.pending_count}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (effectiveAlbumId) router.push(url('team'), { scroll: false })
                  setMoreMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${sidebarMode === 'team'
                  ? 'bg-lime-500/10 border-lime-500/40 text-lime-400'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <div className={`p-2 rounded-lg ${sidebarMode === 'team' ? 'bg-lime-500/20' : 'bg-white/5'}`}>
                  <UserCog className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Kelola Tim</p>
                  <p className="text-[10px] text-gray-500">Atur admin dan anggota tim</p>
                </div>
              </button>
            </div>
            <div className="p-4 border-t border-white/10 bg-black/40">
              <p className="text-[10px] text-gray-600 text-center italic">Manajemen Album Creative Yearbook</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
