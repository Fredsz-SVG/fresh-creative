'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, X, Edit3, ImagePlus, Video, Play, Minus, Instagram, Users, ClipboardList, Menu, Cake, Copy, Link, Clock, BookOpen, MessageSquare, Search, Shirt, UserCircle, ImageIcon, Images, Link as LinkIcon, Sparkles, Book, Layout, Eye, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import NextLink from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { getYearbookSectionQueryUrl } from './lib/yearbook-paths'
import { supabase } from '@/lib/supabase'
import TeacherCard from '@/components/TeacherCard'
import MemberCard from '@/components/MemberCard'
import TryOn from '@/components/fitur/TryOn'
import Pose from '@/components/fitur/Pose'
import ImageEditor from '@/components/fitur/ImageEditor'
import PhotoGroup from '@/components/fitur/PhotoGroup'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'
import { AI_LABS_FEATURES_USER } from '@/lib/dashboard-nav'
import IconSidebar from './components/IconSidebar'
import AILabsView from './components/AILabsView'
import PreviewView from './components/PreviewView'
import SambutanView from './components/SambutanView'
import TeamView from './components/TeamView'
import ApprovalView from './components/ApprovalView'
import FlipbookView from './components/FlipbookView'
import ClassesEmptyView from './components/ClassesEmptyView'
import YearbookMobileNav from './components/YearbookMobileNav'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number; batch_photo_url?: string | null }
type ClassAccess = { id: string; student_name: string; email?: string | null; status: string; date_of_birth?: string | null; instagram?: string | null; message?: string | null; video_url?: string | null }
type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }
type ClassMember = { user_id: string; student_name: string; email: string | null; date_of_birth: string | null; instagram: string | null; message: string | null; video_url: string | null; photos?: string[]; is_me?: boolean }
type StudentInClass = { student_name: string; photo_count: number }
type Photo = { id: string; file_url: string; student_name: string; created_at?: string }
type Teacher = { id: string; name: string; title?: string; message?: string; photo_url?: string; video_url?: string; sort_order?: number; photos?: { id: string; file_url: string; sort_order: number }[] }

function InlineClassEditor(p: any) {
  const classObj = p.classObj as AlbumClass
  const isOwner = p.isOwner as boolean
  const onDelete = p.onDelete
  const onUpdate = p.onUpdate
  const classIndex = p.classIndex as number
  const classesCount = p.classesCount as number
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(classObj?.name ?? '')
  const [order, setOrder] = useState<number>(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  const nameRef = useRef<HTMLInputElement | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setName(classObj?.name ?? '')
    setOrder(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  }, [classObj, classIndex])

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Early return if classObj is null - AFTER all hooks
  if (!classObj) {
    return <div className="text-sm text-gray-500">Memuat...</div>
  }

  const saveChanges = (nameVal: string, orderVal: number) => {
    if (!onUpdate) return
    // Fire and forget - no loading state
    onUpdate(classObj.id, { name: nameVal.trim(), sort_order: Number(orderVal) }).catch((e: any) => {
      console.error('Error saving class:', e)
    })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
  }

  const handleOrderChange = (newOrder: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setOrder(newOrder)
    // Real-time save on order change - immediately, no timeout
    saveChanges(name, newOrder)
  }

  const handleSaveName = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (!name.trim()) {
      alert('Nama kelas tidak boleh kosong')
      return
    }
    saveChanges(name, order)
    setEditing(false)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setEditing(false)
    setName(classObj.name)
    setOrder(classObj.sort_order ?? 0)
  }

  return (
    <div className={`flex items-center gap-2 w-full ${p.center ? 'justify-center' : ''}`}>
      {!editing ? (
        <>
          <h2 className={`text-sm lg:text-base font-semibold text-app flex-1 break-words ${p.center ? 'text-center' : 'text-left'}`}>{classObj.name}</h2>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setEditing(true)
                }}
                className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg hover:bg-lime-600/20 hover:text-lime-400 border border-transparent hover:border-lime-500/30 flex-shrink-0 transition-all"
                title="Edit kelas"
              >
                <Edit3 className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete && onDelete(classObj.id, classObj.name)
                }}
                className="w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 border border-transparent hover:border-red-500/30 flex-shrink-0 transition-all"
                title="Hapus kelas"
              >
                <Trash2 className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
              </button>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3 w-full bg-white/5 p-3 rounded-lg border border-lime-500/50">
          {/* Title */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Edit3 className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-lime-400">Edit Nama Kelas</span>
          </div>

          {/* Input Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Nama Kelas</label>
            <input
              ref={nameRef}
              value={name}
              onChange={handleNameChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSaveName()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCancel()
                }
              }}
              placeholder="Masukkan nama kelas..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/20 text-app placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
            />
            <span className="text-[10px] text-gray-500">Tekan Enter untuk simpan, Esc untuk batal</span>
          </div>

          {/* Urutan Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Urutan Kelas</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleOrderChange(Math.max(0, (order ?? 0) - 1), e)}
                className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 border border-white/10 transition-all"
                disabled={order === 0}
                title="Pindah ke atas"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 text-center px-3 py-2 bg-black/30 rounded-lg border border-white/10">
                <span className="text-sm font-bold text-lime-400">{Math.min((order ?? 0) + 1, classesCount || 1)}</span>
                <span className="text-xs text-gray-500"> dari {classesCount || 1}</span>
              </div>

              <button
                type="button"
                onClick={(e) => handleOrderChange(Math.min((classesCount || 1) - 1, (order ?? 0) + 1), e)}
                className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 border border-white/10 transition-all"
                disabled={order >= (classesCount || 1) - 1}
                title="Pindah ke bawah"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={(e) => handleSaveName(e)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 font-medium text-sm transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleCancel(e)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 font-medium text-sm transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default function YearbookClassesViewUI(props: any) {
  // YearbookClassesView component - displays member grid with photos and profiles
  const {
    albumId: albumIdProp = '',
    album = null,
    classes = [],
    currentClass = null,
    students = [],
    classIndex = 0,
    setClassIndex,
    setView,
    isOwner = false,
    isAlbumAdmin = false,
    isGlobalAdmin = false,
    addingClass = false,
    setAddingClass,
    newClassName = '',
    setNewClassName,
    handleAddClass,
    handleDeleteClass,
    handleUpdateClass,
    goPrevClass,
    goNextClass,
    requestsByClass = {},
    myAccessByClass = {},
    myRequestByClass = {},
    accessDataLoaded = false,
    selectedRequestId = null,
    setSelectedRequestId,
    sidebarMode = 'classes' as 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview',
    setSidebarMode,
    requestForm = { student_name: '', email: '' },
    setRequestForm,
    handleRequestAccess,
    handleJoinAsOwner,
    handleApproveReject,
    editingProfileClassId = null,
    setEditingProfileClassId,
    editingMemberUserId = null,
    setEditingMemberUserId,
    onStartEditMember,
    onStartEditMyProfile,
    editProfileName = '',
    setEditProfileName,
    editProfileEmail = '',
    setEditProfileEmail,
    editProfileTtl = '',
    setEditProfileTtl,
    editProfileInstagram = '',
    setEditProfileInstagram,
    editProfilePesan = '',
    setEditProfilePesan,
    editProfileVideoUrl = '',
    setEditProfileVideoUrl,
    handleSaveProfile,
    savingProfile = false,
    membersByClass = {},
    classViewMode = 'personal',
    setClassViewMode,
    personalIndex = 0,
    setPersonalIndex,
    fetchMembersForClass,
    openGallery,
    onUploadPhoto,
    onUploadVideo,
    onDeletePhoto,
    personalCardExpanded = false,
    setPersonalCardExpanded,
    firstPhotoByStudent = {},
    studentPhotosInCard = [],
    studentNameForPhotosInCard = null,
    studentPhotoIndexInCard = 0,
    setStudentPhotoIndexInCard,
    lastUploadedVideoName = null,
    onPlayVideo,
    fetchStudentPhotosForCard,
    studentsByClass = {},
    isCoverView = false,
    uploadingCover = false,
    coverPreview = null,
    setCoverPreview,
    coverPosition = { x: 50, y: 50 },
    setCoverPosition,
    handleUploadCover,
    handleDeleteCover,
    handleUploadCoverVideo,
    handleDeleteCoverVideo,
    uploadingCoverVideo = false,
    currentUserId = null,
    handleUpdateRole,
    handleRemoveMember,
    handleDeleteClassMember: handleDeleteClassMemberProp,
    fetchAlbum,
    flipbookPreviewMode = false,
    setFlipbookPreviewMode = () => { },
    mobileMenuOpen = false,
    setMobileMenuOpen = () => { },
  } = props

  const router = useRouter()
  const pathname = usePathname()
  const effectiveAlbumId = albumIdProp || album?.id || ''
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const uploadPhotoTargetRef = useRef<any>(null)
  const uploadVideoTargetRef = useRef<any>(null)
  const teacherPhotoInputRef = useRef<HTMLInputElement>(null)
  const teacherVideoInputRef = useRef<HTMLInputElement>(null)
  const uploadTeacherPhotoTargetRef = useRef<string | null>(null)
  const uploadTeacherVideoTargetRef = useRef<string | null>(null)
  const coverPreviewContainerRef = useRef<HTMLDivElement>(null)
  const coverDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const coverUploadInputRef = useRef<HTMLInputElement>(null)
  const coverVideoInputRef = useRef<HTMLInputElement>(null)
  // Section terakhir sebelum Preview — dipakai saat tombol X di Preview diklik
  const lastSectionBeforePreviewRef = useRef<'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview'>('classes')
  useEffect(() => {
    if (sidebarMode !== 'preview') lastSectionBeforePreviewRef.current = sidebarMode
  }, [sidebarMode])
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [members, setMembers] = useState<{ user_id: string; email: string; name?: string; role: string }[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  // Batch Photo additions
  const batchPhotoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingBatchPhotoClassId, setUploadingBatchPhotoClassId] = useState<string | null>(null)
  const [viewingBatchPhotoClass, setViewingBatchPhotoClass] = useState<AlbumClass | null>(null)


  // Join requests state
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [joinStats, setJoinStats] = useState<any>(null)
  const [savingLimit, setSavingLimit] = useState(false)
  const [approvalTab, setApprovalTab] = useState<'pending' | 'approved'>('pending')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [deleteClassConfirm, setDeleteClassConfirm] = useState<{ classId: string; className: string } | null>(null)
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<{ classId: string; userId?: string; memberName: string } | null>(null)

  // Manual Flipbook Pages state
  const [manualPages, setManualPages] = useState<any[]>([])


  const searchParams = useSearchParams()
  const aiLabsTool = searchParams.get('tool')

  const stripOriginForDisplay = (url: string) => {
    if (!url) return ''
    try {
      if (!url.startsWith('http')) return url
      const u = new URL(url)
      return u.pathname + u.search
    } catch {
      return url
    }
  }

  const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

  const fetchMembers = async () => {
    if (!album?.id) return
    const res = await fetch(`/api/albums/${album.id}/members`, { credentials: 'include' })
    const data = await res.json().catch(() => [])
    if (res.ok && Array.isArray(data)) {
      setMembers(data)
      props.onTeamMemberCountChange?.(data.length)
    }
  }

  // Wrap handlers to refresh members after success
  const handleUpdateRoleWrapper = async (userId: string, role: 'admin' | 'member') => {
    if (!handleUpdateRole) return
    await handleUpdateRole(userId, role)
    // Refresh members list after role update
    await fetchMembers()
  }

  const handleRemoveMemberWrapper = async (userId: string) => {
    if (!handleRemoveMember) return
    await handleRemoveMember(userId)
    // Refresh members list after removal
    await fetchMembers()
  }

  // Delete member from class - delegates to parent for optimistic update + realtime sync
  const handleDeleteClassMember = async (classId: string, userId: string) => {
    if (handleDeleteClassMemberProp) {
      await handleDeleteClassMemberProp(classId, userId)
    }
  }

  useEffect(() => {
    if (sidebarMode === 'team' && canManage) {
      fetchMembers()
    }
  }, [sidebarMode, canManage, album?.id])

  // Fetch teachers
  const fetchTeachers = async () => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers`, { credentials: 'include' })
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setTeachers(data)
        props.onTeacherCountChange?.(data.length)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  useEffect(() => {
    if ((sidebarMode === 'sambutan' || sidebarMode === 'flipbook' || sidebarMode === 'preview') && album?.id) {
      fetchTeachers()
    }
  }, [sidebarMode, album?.id])

  // Fetch Manual Pages
  const fetchManualPages = async () => {
    if (!album?.id) return
    const { data: pages, error } = await supabase
      .from('manual_flipbook_pages')
      .select('*, flipbook_video_hotspots(*)')
      .eq('album_id', album.id)
      .order('page_number', { ascending: true })

    if (error) {
      console.error('Error fetching manual pages:', error)
      return
    }
    if (pages) {
      setManualPages(pages)
    }
  }

  useEffect(() => {
    if (sidebarMode === 'flipbook' && album?.id) {
      fetchManualPages()
    }
  }, [sidebarMode, album?.id, flipbookPreviewMode])

  // Realtime Subscription for flipbook hotspots - ensures viewer is always up to date
  useEffect(() => {
    if (!album?.id) return

    const channel = supabase
      .channel(`flipbook-hotspots-view-${album.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flipbook_video_hotspots',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as any

          if (eventType === 'INSERT') {
            setManualPages((prev: any[]) => prev.map(page => {
              if (page.id === newRecord.page_id) {
                // Prevent duplicates
                if (page.flipbook_video_hotspots?.some((h: any) => h.id === newRecord.id)) {
                  return page
                }
                return {
                  ...page,
                  flipbook_video_hotspots: [...(page.flipbook_video_hotspots || []), newRecord]
                }
              }
              return page
            }))
          } else if (eventType === 'UPDATE') {
            setManualPages((prev: any[]) => prev.map(page => ({
              ...page,
              flipbook_video_hotspots: page.flipbook_video_hotspots?.map((h: any) =>
                h.id === newRecord.id ? { ...h, ...newRecord } : h
              )
            })))
          } else if (eventType === 'DELETE') {
            setManualPages((prev: any[]) => prev.map(page => ({
              ...page,
              flipbook_video_hotspots: page.flipbook_video_hotspots?.filter((h: any) => h.id !== oldRecord.id)
            })))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [album?.id])

  // Realtime: tampilkan link undangan langsung ke semua admin (album + global) saat ada yang buat
  useEffect(() => {
    if (!album?.id || !canManage) return

    const channel = supabase
      .channel(`album-invite-token-${album.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'albums',
          filter: `id=eq.${album.id}`,
        },
        (payload) => {
          const newRecord = (payload as { new?: Record<string, unknown> }).new
          if (newRecord && ('student_invite_token' in newRecord || 'student_invite_expires_at' in newRecord)) {
            setInviteToken((newRecord.student_invite_token as string) || null)
            setInviteExpiresAt((newRecord.student_invite_expires_at as string) || null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [album?.id, canManage])

  // Fetch invite token
  const fetchInviteToken = async () => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/invite-token`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setInviteToken(data.token || null)
        setInviteExpiresAt(data.expiresAt || null)
      }
    } catch (error) {
      console.error('Error fetching invite token:', error)
    }
  }

  // Generate new invite token
  const handleGenerateInviteToken = async () => {
    if (!album?.id || generatingInvite) return
    setGeneratingInvite(true)
    try {
      const res = await fetch(`/api/albums/${album.id}/invite-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 7 })
      })
      if (res.ok) {
        const data = await res.json()
        setInviteToken(data.token)
        setInviteExpiresAt(data.expiresAt)
        toast.success('Link undangan berhasil dibuat!')
      } else {
        toast.error('Gagal membuat link undangan')
      }
    } catch (error) {
      console.error('Error generating invite token:', error)
      toast.error('Terjadi kesalahan')
    } finally {
      setGeneratingInvite(false)
    }
  }

  useEffect(() => {
    if (sidebarMode === 'approval' && canManage && album?.id) {
      fetchInviteToken()
    }
  }, [sidebarMode, canManage, album?.id])

  // Fetch join requests and stats
  const fetchJoinRequests = async (status?: 'pending' | 'approved' | 'all') => {
    if (!album?.id || !canManage) return
    try {
      const params = status ? `?status=${status}` : '?status=all'
      const res = await fetch(`/api/albums/${album.id}/join-requests${params}`, { credentials: 'include' })
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setJoinRequests(data)
      }
    } catch (error) {
      console.error('Error fetching join requests:', error)
    }
  }

  const fetchJoinStats = async () => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/join-stats`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setJoinStats(data)
      }
    } catch (error) {
      console.error('Error fetching join stats:', error)
    }
  }

  useEffect(() => {
    if (sidebarMode === 'approval' && canManage) {
      fetchJoinRequests(approvalTab)
      fetchJoinStats()
    }
  }, [sidebarMode, approvalTab, canManage, album?.id])

  // Handle approve join request
  const handleApproveJoinRequest = async (requestId: string, assigned_class_id: string) => {
    if (!album?.id || !assigned_class_id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', assigned_class_id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Request disetujui! Member berhasil ditambahkan.')
        fetchJoinRequests(approvalTab)
        fetchJoinStats()
        if (fetchMembersForClass) {
          await fetchMembersForClass(assigned_class_id)
        }
      } else {
        toast.error(data.error || 'Gagal menyetujui request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleSaveLimit = async (val: number) => {
    const currentLimit = joinStats?.approved_count || 0
    if (!val || val < 1) {
      toast.error('Jumlah harus minimal 1')
      return
    }
    if (val < currentLimit) {
      toast.error(`Tidak bisa dikurangi. Batas saat ini: ${currentLimit}`)
      return
    }
    setSavingLimit(true)
    try {
      const res = await fetch(`/api/albums/${album?.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students_count: val }),
      })
      if (res.ok) {
        toast.success(`Batas diubah menjadi ${val}`)
        fetchJoinStats()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Gagal mengubah batas')
      }
    } catch {
      toast.error('Gagal mengubah batas')
    } finally {
      setSavingLimit(false)
    }
  }

  // Handle reject join request
  const handleRejectJoinRequest = async (requestId: string, reason?: string) => {
    if (!album?.id) return
    if (!confirm('Yakin ingin menolak request ini?')) return
    try {
      const res = await fetch(`/api/albums/${album.id}/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejected_reason: reason }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Request ditolak')
        fetchJoinRequests(approvalTab)
        fetchJoinStats()
      } else {
        toast.error(data.error || 'Gagal menolak request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  // Teacher handlers
  const handleAddTeacher = async (name: string, title: string) => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, title }),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setTeachers(prev => [...prev, data])
        props.onTeacherCountChange?.(teachers.length + 1)
        toast.success('Berhasil ditambahkan')
      } else {
        toast.error(data.error || 'Gagal menambahkan')
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleUpdateTeacher = async (teacherId: string, updates: { name?: string; title?: string; message?: string; video_url?: string }) => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setTeachers(prev => prev.map(t => t.id === teacherId ? { ...data, photos: t.photos } : t))
        toast.success('Data guru berhasil diperbarui')
      } else {
        toast.error(data.error || 'Gagal memperbarui guru')
      }
    } catch (error) {
      console.error('Error updating teacher:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTeachers(prev => prev.filter(t => t.id !== teacherId))
        props.onTeacherCountChange?.(teachers.length - 1)
        toast.success('Guru berhasil dihapus')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus guru')
      }
    } catch (error) {
      console.error('Error deleting teacher:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleUploadTeacherPhoto = async (teacherId: string, file: File) => {
    if (!album?.id) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Foto maksimal 10MB')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}/photos`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.id) {
        // Add new photo to teacher's photos array
        setTeachers(prev => prev.map(t => {
          if (t.id === teacherId) {
            const photos = t.photos || []
            return { ...t, photos: [...photos, data] }
          }
          return t
        }))
        toast.success('Foto berhasil diupload')
      } else {
        toast.error(data.error || 'Gagal upload foto')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleDeleteTeacherPhoto = async (teacherId: string, photoId: string) => {
    if (!album?.id) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        // Remove photo from teacher's photos array
        setTeachers(prev => prev.map(t => {
          if (t.id === teacherId) {
            const photos = (t.photos || []).filter(p => p.id !== photoId)
            return { ...t, photos }
          }
          return t
        }))
        toast.success('Foto berhasil dihapus')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus foto')
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const handleDeleteTeacherPhotoOld = async (teacherId: string) => {
    if (!album?.id) return
    if (!confirm('Hapus foto guru?')) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}/photo`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTeachers(prev => prev.map(t =>
          t.id === teacherId ? { ...t, photo_url: undefined } : t
        ))
        toast.success('Foto berhasil dihapus')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus foto')
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB

  const handleUploadTeacherVideo = async (teacherId: string, file: File) => {
    if (!album?.id) return
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error('Video maksimal 20MB')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}/video`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.video_url) {
        setTeachers(prev => prev.map(t =>
          t.id === teacherId ? { ...t, video_url: data.video_url } : t
        ))
        toast.success('Video berhasil diupload')
      } else {
        toast.error(data.error || 'Gagal upload video')
      }
    } catch (error) {
      console.error('Error uploading video:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  // Batch photo handlers
  const handleUploadBatchPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingBatchPhotoClassId || !album?.id) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Foto maksimal 10MB')
      e.target.value = ''
      return
    }

    const classId = uploadingBatchPhotoClassId
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/albums/${album.id}/classes/${classId}/photo`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.batch_photo_url) {
        toast.success('Foto angkatan berhasil diupload')
        // Optimistic update via parent — also triggers realtime for other devices
        if (handleUpdateClass) {
          await handleUpdateClass(classId, { batch_photo_url: data.batch_photo_url })
        }
      } else {
        toast.error(data.error || 'Gagal upload foto')
      }
    } catch (error) {
      console.error('Error uploading batch photo:', error)
      toast.error('Terjadi kesalahan')
    } finally {
      if (batchPhotoInputRef.current) batchPhotoInputRef.current.value = ''
      setUploadingBatchPhotoClassId(null)
    }
  }

  const handleDeleteBatchPhoto = async (classId: string) => {
    if (!album?.id || !confirm('Hapus foto angkatan ini?')) return

    // Optimistic update: clear immediately in local state
    if (handleUpdateClass) {
      handleUpdateClass(classId, { batch_photo_url: '' })
    }

    try {
      const res = await fetch(`/api/albums/${album.id}/classes/${classId}/photo`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Foto angkatan dihapus')
        // Confirm the null state (optimistic already applied)
        if (handleUpdateClass) {
          handleUpdateClass(classId, { batch_photo_url: '' })
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus foto')
        // Rollback: refetch album to restore correct state (silent = no skeleton)
        if (fetchAlbum) fetchAlbum(true)
      }
    } catch (error) {
      console.error('Error deleting batch photo:', error)
      toast.error('Terjadi kesalahan')
      if (fetchAlbum) fetchAlbum(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col w-full lg:max-w-full">
      <YearbookMobileNav
        pathname={pathname}
        effectiveAlbumId={effectiveAlbumId ?? ''}
        isCoverView={isCoverView}
        sidebarMode={sidebarMode}
        canManage={canManage}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        moreMenuOpen={moreMenuOpen}
        setMoreMenuOpen={setMoreMenuOpen}
        joinStats={joinStats}
        classes={classes}
        classIndex={classIndex}
        setClassIndex={setClassIndex}
        myRequestByClass={myRequestByClass}
        membersByClass={membersByClass}
        myAccessByClass={myAccessByClass}
        currentClass={currentClass}
        addingClass={addingClass}
        setAddingClass={setAddingClass}
        handleUpdateClass={handleUpdateClass}
        setDeleteClassConfirm={setDeleteClassConfirm}
      />
      {/* Main Content - Header already sticky in parent (page.tsx) */}
      <div className="flex-1 flex flex-col p-4 pb-8">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0]
          const target = uploadPhotoTargetRef.current
          if (target && file) {
            if (file.size > MAX_PHOTO_BYTES) {
              toast.error('Foto maksimal 10MB')
              e.target.value = ''
              return
            }
            if (typeof onUploadPhoto === 'function') onUploadPhoto(target.classId, target.studentName, target.className, file)
          }
          uploadPhotoTargetRef.current = null
          e.target.value = ''
        }} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0]
          const target = uploadVideoTargetRef.current
          if (target && file) {
            if (file.size > 20 * 1024 * 1024) {
              toast.error('Video maksimal 20MB')
              e.target.value = ''
              return
            }
            if (typeof onUploadVideo === 'function') onUploadVideo(target.classId, target.studentName, target.className, file)
          }
          uploadVideoTargetRef.current = null
          e.target.value = ''
        }} />
        <input ref={teacherPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0]
          const teacherId = uploadTeacherPhotoTargetRef.current
          if (teacherId && file) {
            await handleUploadTeacherPhoto(teacherId, file)
          }
          uploadTeacherPhotoTargetRef.current = null
          e.target.value = ''
        }} />
        <input ref={teacherVideoInputRef} type="file" accept="video/*" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0]
          const teacherId = uploadTeacherVideoTargetRef.current
          if (teacherId && file) {
            await handleUploadTeacherVideo(teacherId, file)
          }
          uploadTeacherVideoTargetRef.current = null
          e.target.value = ''
        }} />



        <div className="flex flex-col lg:flex-row gap-0 flex-1 lg:pl-16 lg:px-0 lg:py-0">
          {/* Icon Sidebar untuk desktop - Fixed di kiri */}
          {/* Icon Sidebar untuk desktop - Fixed di kiri */}
          <IconSidebar
            pathname={pathname}
            albumId={effectiveAlbumId}
            isCoverView={isCoverView}
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            setView={setView}
            canManage={canManage}
            requestsByClass={requestsByClass}
          />

          {/* Panel Group List - Fixed di tengah (hanya tampil saat mode classes) */}
          {sidebarMode === 'classes' && !isCoverView && (
            <div className="hidden lg:fixed lg:left-16 lg:top-[3.75rem] lg:w-56 lg:h-[calc(100vh-3.75rem)] lg:flex flex-col lg:z-35 lg:bg-black/30 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
              {/* Header Fixed - Group Name + Edit */}
              {currentClass && (
                <div className="flex-shrink-0 px-4 py-4 border-b border-white/10">
                  <InlineClassEditor
                    classObj={currentClass}
                    isOwner={canManage}
                    onDelete={(classId, className) => setDeleteClassConfirm({ classId, className: className ?? currentClass?.name ?? '' })}
                    onUpdate={handleUpdateClass}
                    classIndex={classIndex}
                    classesCount={classes.length}
                  />
                </div>
              )}

              {/* Form Fixed - Daftarkan Nama */}
              {currentClass && (
                <div className="flex-shrink-0 px-3 py-5 border-b border-white/10">
                  {(() => {
                    const access = myAccessByClass[currentClass.id]
                    const request = myRequestByClass[currentClass.id] as ClassRequest | null | undefined
                    const isPendingRequest = request?.status === 'pending'
                    const isRejectedRequest = request?.status === 'rejected'
                    const isLoadingThisClass = !accessDataLoaded && !access && !request

                    // DEBUG LOG
                    if (isOwner) {
                      console.log('[GroupPanel DEBUG]', {
                        currentClassId: currentClass.id,
                        isOwner,
                        canManage,
                        access,
                        request,
                        isPendingRequest,
                        isLoadingThisClass,
                        accessDataLoaded,
                        allAccess: myAccessByClass
                      })
                    }

                    // Show compact loading hanya untuk class ini
                    if (isLoadingThisClass) {
                      return (
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <div className="animate-spin rounded-full h-3 w-3 border border-lime-500 border-t-transparent" />
                          <span>Memuat...</span>
                        </div>
                      )
                    }

                    // User dengan access approved (termasuk owner/admin yang sudah terdaftar)
                    if (access?.status === 'approved') {
                      return (
                        <>
                          <p className="text-xs text-muted mb-1">Status:</p>
                          <p className="text-xs font-medium text-lime-400">✓ {access.student_name}</p>
                        </>
                      )
                    }

                    // Owner tanpa akses - cek apakah sudah terdaftar di kelas lain
                    if (isOwner && !isPendingRequest && !access) {
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
                          <>
                            <p className="text-amber-400 text-xs mb-1">⚠️ Batas Pendaftaran</p>
                            <p className="text-muted text-xs">
                              Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.
                            </p>
                          </>
                        )
                      }

                      // Show join button — teks khusus owner
                      return (
                        <>
                          <p className="text-muted text-xs mb-2">
                            Kamu owner album. Daftar sendiri untuk masuk kelas ini dan upload foto.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleJoinAsOwner(currentClass.id)}
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors w-full"
                          >
                            Daftar di Kelas Ini
                          </button>
                        </>
                      )
                    }

                    // Admin/helper yang bukan owner - tidak perlu form
                    if (canManage) {
                      return null
                    }

                    // User biasa dengan pending request
                    if (isPendingRequest) {
                      return (
                        <>
                          <p className="text-xs text-muted mb-1">Status Pendaftaran:</p>
                          <p className="text-amber-400 text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" /> Menunggu persetujuan
                          </p>
                        </>
                      )
                    }

                    // User tanpa akses - tidak tampilkan form, sistem menggunakan link registrasi universal
                    return null

                  })()}
                </div>
              )}

              {/* Scrollable Content Area with Hidden Scrollbar */}
              <div className="flex-1 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                {/* Scrollable Group List */}
                <div className="flex-1 flex flex-col gap-1.5 px-2 py-2">
                  {classes.map((c, idx) => {
                    const req = myRequestByClass[c.id] as ClassRequest | undefined
                    const hasPendingRequest = req?.status === 'pending'
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setClassIndex(idx)
                          if (isCoverView) setView('classes')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setClassIndex(idx)
                            if (isCoverView) setView('classes')
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg text-left text-sm transition-colors touch-manipulation cursor-pointer ${idx === classIndex && !isCoverView
                          ? 'bg-lime-600/20 border border-lime-500/50 text-lime-400'
                          : 'border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                          }`}
                      >
                        <p className="font-medium truncate">{c.name}</p>
                        {hasPendingRequest ? (
                          <p className="text-xs text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> menunggu persetujuan</p>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted">{(membersByClass[c.id]?.length ?? 0)} orang</p>
                            {/* Batch Photo Indicator/Button */}
                            {(c.batch_photo_url || canManage) && (
                              <div className="flex items-center gap-1">
                                {c.batch_photo_url && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setViewingBatchPhotoClass(c)
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-lime-400"
                                    title="Lihat Foto Angkatan"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                  </button>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setUploadingBatchPhotoClassId(c.id)
                                      batchPhotoInputRef.current?.click()
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                    title={c.batch_photo_url ? "Ganti Foto Angkatan" : "Tambah Foto Angkatan"}
                                  >
                                    <ImagePlus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Add Group Button - Restored; saat belum ada kelas form hanya di main konten */}
              <div className="flex-shrink-0 px-2 py-2 border-t border-white/10">
                {canManage && (
                  <div className="flex gap-2">
                    {!addingClass || classes.length === 0 ? (
                      <button type="button" onClick={() => setAddingClass(true)} className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation">
                        <Plus className="w-4 h-4 inline mr-1" /> Nama kelas
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Nama kelas" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-app placeholder:text-gray-600" autoFocus />
                        <div className="flex gap-2">
                          <button type="button" onClick={handleAddClass} className="flex-1 px-2 py-1.5 rounded-lg bg-lime-600 text-white text-sm font-medium hover:bg-lime-500 transition-colors touch-manipulation">Tambah</button>
                          <button type="button" onClick={() => { setAddingClass(false); setNewClassName('') }} className="flex-1 px-2 py-1.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors touch-manipulation">Batal</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Approval Detail Panel - Fixed di sebelah kanan sidebar icon */}
          {sidebarMode === 'approval' && selectedRequestId && (
            <>
              {/* Backdrop untuk close */}
              <div
                className="hidden lg:fixed lg:inset-0 lg:z-30"
                onClick={() => setSelectedRequestId(null)}
              />
              <div className="hidden lg:flex lg:fixed lg:left-16 lg:top-[3.75rem] lg:w-56 lg:h-[calc(100vh-3.75rem)] lg:bg-black/40 lg:backdrop-blur-sm lg:border-l lg:border-white/10 lg:p-4 lg:z-35 lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  className="self-end text-gray-400 hover:text-white mb-4 text-lg"
                  title="Tutup"
                >
                  ✕
                </button>
                {(() => {
                  const allRequests = Object.values(requestsByClass).flat() as ClassRequest[]
                  const request = allRequests.find(r => r.id === selectedRequestId)
                  const classId = Object.entries(requestsByClass).find(([_, reqs]) => {
                    const reqList = reqs as ClassRequest[]
                    return reqList.find(r => r.id === selectedRequestId)
                  })?.[0]
                  if (!request || !classId) return null
                  return (
                    <div className="w-full flex flex-col gap-4">
                      <div className="text-center">
                        <p className="text-app font-medium text-sm">{request.student_name}</p>
                        {request.email && <p className="text-muted text-xs break-all">{request.email}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveReject(classId, selectedRequestId, 'approved')}
                          className="px-4 py-2.5 rounded-lg bg-green-600/80 text-white hover:bg-green-600 text-xs font-medium transition-colors w-full"
                          title="Setujui"
                        >
                          ✓ Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveReject(classId, selectedRequestId, 'rejected')}
                          className="px-4 py-2.5 rounded-lg bg-red-600/80 text-white hover:bg-red-600 text-xs font-medium transition-colors w-full"
                          title="Tolak"
                        >
                          ✕ Tolak
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </>
          )}

          {/* Sambutan Panel - Removed, now using grid layout like students */}

          {/* Main content area - Shows Classes/Approval/Team based on sidebarMode */}
          <div className={`flex-1 flex flex-col gap-0 min-h-0 ${(!isCoverView && sidebarMode === 'classes') ? 'pt-14 lg:pt-0' : 'pt-0'}`}>
            {/* Mobile class header - Fixed - Only for classes mode */}
            {/* Mobile class header removed - now in Global Header */}



            {/* Form request access dihapus - sistem menggunakan link registrasi universal */}

            {/* Mobile Sambutan View - Removed, using grid layout */}

            {/* Main content - scrollable container */}
            <div className={`flex-1 overflow-y-auto rounded-t-none pb-40 lg:pb-0 ${sidebarMode === 'classes' && !isCoverView ? 'lg:ml-[18rem]' : 'lg:ml-0'}`}>
              {/* Show different content based on sidebarMode */}
              {isCoverView ? (
                <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-xs mx-auto flex flex-col items-center">
                      <div className="relative w-full aspect-[3/4] bg-white/5 rounded-xl overflow-hidden shadow-xl border border-white/10 group">
                        {album?.cover_image_url ? (
                          <img
                            src={album.cover_image_url}
                            alt={album.name}
                            className="w-full h-full object-cover"
                            style={album.cover_image_position ? { objectPosition: `${album.cover_image_position}` } : undefined}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full text-muted gap-3">
                            <BookOpen className="w-12 h-12 opacity-50" />
                            <span className="text-xs">Sampul album</span>
                          </div>
                        )}

                        {/* Video Overlay Button */}
                        {album?.cover_video_url && (
                          <button
                            type="button"
                            onClick={() => onPlayVideo && onPlayVideo(album.cover_video_url!)}
                            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center group/play transition-all hover:scale-110 backdrop-blur-sm border border-white/10"
                            title="Putar Video Sampul"
                          >
                            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 text-center w-full">
                        <h1 className="text-2xl font-bold text-app mb-1">{album?.name}</h1>
                        {album?.description && <p className="text-muted text-xs max-w-lg mx-auto leading-relaxed">{album.description}</p>}
                      </div>

                      {isOwner && (
                        <>
                          {/* Cover Settings Section */}
                          <div className="mt-3 p-3 w-full rounded-xl bg-white/5 border border-white/10">
                            <div className="mb-3 text-center">
                              <p className="text-xs font-semibold text-app">Pengaturan Sampul</p>
                            </div>

                            {/* Gambar Section */}
                            <div className="mb-3">
                              <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Gambar <span className="normal-case text-muted/80">(maks. 10MB)</span></p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => coverUploadInputRef.current?.click()}
                                  disabled={uploadingCover}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all disabled:opacity-50 min-h-[36px]"
                                >
                                  <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{uploadingCover ? 'Upload...' : (album?.cover_image_url ? 'Ubah' : 'Upload')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteCover}
                                  disabled={!album?.cover_image_url || !handleDeleteCover}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-medium border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
                                >
                                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Hapus</span>
                                </button>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/10 my-2.5"></div>

                            {/* Video Section */}
                            <div>
                              <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Video <span className="normal-case text-muted/80">(maks. 20MB)</span></p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => coverVideoInputRef.current?.click()}
                                  disabled={uploadingCoverVideo}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all disabled:opacity-50 min-h-[36px]"
                                >
                                  <Video className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{uploadingCoverVideo ? 'Upload...' : (album?.cover_video_url ? 'Ubah' : 'Upload')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteCoverVideo}
                                  disabled={!album?.cover_video_url || !handleDeleteCoverVideo}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-medium border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[36px]"
                                >
                                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Hapus</span>
                                </button>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/10 my-2.5"></div>

                            {/* Public Preview Link Section */}
                            <div>
                              <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Link Preview Publik</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const url = `${window.location.origin}/album/${album?.id}/preview`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('Link berhasil disalin');
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-[11px] font-medium border border-white/10 transition-all min-h-[36px]"
                                >
                                  <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Salin Link</span>
                                </button>
                                <NextLink
                                  href={`/album/${album?.id}/preview`}
                                  target="_blank"
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 text-[11px] font-medium border border-lime-500/20 transition-all min-h-[36px]"
                                >
                                  <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Buka Preview</span>
                                </NextLink>
                              </div>
                            </div>

                            {/* Hidden inputs */}
                            <input
                              ref={coverUploadInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file && setCoverPreview) {
                                  if (file.size > MAX_PHOTO_BYTES) {
                                    toast.error('Foto maksimal 10MB')
                                    e.target.value = ''
                                    return
                                  }
                                  const dataUrl = URL.createObjectURL(file)
                                  setCoverPreview({ file, dataUrl })
                                  setCoverPosition && setCoverPosition({ x: 50, y: 50 })
                                }
                                e.target.value = ''
                              }}
                            />
                            <input
                              ref={coverVideoInputRef}
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                e.target.value = ''
                                if (file && handleUploadCoverVideo) {
                                  if (file.size > 20 * 1024 * 1024) {
                                    toast.error('Video maksimal 20MB')
                                    return
                                  }
                                  await handleUploadCoverVideo(file)
                                }
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Cover Preview Modal */}
                      {coverPreview && (
                        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
                          <p className="text-app font-medium mb-3">Geser gambar agar posisi pas, lalu Terapkan</p>
                          <div
                            ref={coverPreviewContainerRef}
                            className="w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden bg-white/10 relative touch-none select-none border border-white/20"
                            onPointerDown={(e) => {
                              if (e.button !== 0) return
                              coverDragRef.current = {
                                startX: e.clientX,
                                startY: e.clientY,
                                startPosX: coverPosition.x,
                                startPosY: coverPosition.y,
                              };
                              (e.target as HTMLElement).setPointerCapture(e.pointerId)
                            }}
                            onPointerMove={(e) => {
                              if (!coverDragRef.current || !setCoverPosition) return
                              const el = coverPreviewContainerRef.current
                              if (!el) return
                              const rect = el.getBoundingClientRect()
                              const dx = (e.clientX - coverDragRef.current.startX) / rect.width * 100
                              const dy = (e.clientY - coverDragRef.current.startY) / rect.height * 100
                              setCoverPosition({
                                x: Math.min(100, Math.max(0, coverDragRef.current.startPosX - dx)),
                                y: Math.min(100, Math.max(0, coverDragRef.current.startPosY - dy)),
                              })
                            }}
                            onPointerUp={(e) => {
                              if (coverDragRef.current) {
                                (e.target as HTMLElement).releasePointerCapture(e.pointerId)
                                coverDragRef.current = null
                              }
                            }}
                            onPointerCancel={(e) => {
                              coverDragRef.current = null;
                              (e.target as HTMLElement).releasePointerCapture(e.pointerId)
                            }}
                          >
                            <img
                              src={coverPreview.dataUrl}
                              alt="Preview sampul"
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                              style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
                            />
                          </div>
                          <div className="flex gap-3 mt-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (coverPreview?.dataUrl) URL.revokeObjectURL(coverPreview.dataUrl)
                                setCoverPreview && setCoverPreview(null)
                              }}
                              className="px-5 py-2.5 rounded-xl border border-white/20 text-app font-medium hover:bg-white/10"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={uploadingCover}
                              onClick={() => handleUploadCover && handleUploadCover(coverPreview.file, coverPosition, coverPreview.dataUrl)}
                              className="px-5 py-2.5 rounded-xl bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
                            >
                              {uploadingCover ? 'Mengunggah...' : 'Terapkan'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : sidebarMode === 'ai-labs' ? (
                /* AI Labs - Fitur (Try On, Pose, dll.) tetap di album, URL ?tool=... */
                /* AI Labs - Fitur (Try On, Pose, dll.) tetap di album, URL ?tool=... */
                <AILabsView album={album} aiLabsTool={aiLabsTool ?? null} />
              ) : sidebarMode === 'approval' ? (
                <ApprovalView
                  joinStats={joinStats}
                  canManage={canManage}
                  approvalTab={approvalTab}
                  setApprovalTab={setApprovalTab}
                  joinRequests={joinRequests}
                  classes={classes}
                  inviteToken={inviteToken}
                  inviteExpiresAt={inviteExpiresAt}
                  generatingInvite={generatingInvite}
                  onGenerateInvite={handleGenerateInviteToken}
                  savingLimit={savingLimit}
                  onSaveLimit={handleSaveLimit}
                  onApproveRequest={handleApproveJoinRequest}
                  onRejectRequest={handleRejectJoinRequest}
                />
              ) : sidebarMode === 'team' ? (
                <TeamView
                  members={members}
                  isOwner={isOwner}
                  isGlobalAdmin={isGlobalAdmin}
                  canManage={canManage}
                  currentUserId={currentUserId}
                  onUpdateRole={handleUpdateRoleWrapper}
                  onRemoveMember={handleRemoveMemberWrapper}
                />
              ) : sidebarMode === 'sambutan' ? (
                <SambutanView
                  teachers={teachers}
                  canManage={canManage}
                  onAddTeacher={handleAddTeacher}
                  onUpdateTeacher={handleUpdateTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  onUploadPhoto={(teacherId) => {
                    if (teacherPhotoInputRef.current) {
                      uploadTeacherPhotoTargetRef.current = teacherId
                      teacherPhotoInputRef.current.click()
                    }
                  }}
                  onUploadVideo={(teacherId) => {
                    if (teacherVideoInputRef.current) {
                      uploadTeacherVideoTargetRef.current = teacherId
                      teacherVideoInputRef.current.click()
                    }
                  }}
                  onDeletePhoto={handleDeleteTeacherPhoto}
                />
              ) : sidebarMode === 'classes' && classes.length === 0 ? (
                <ClassesEmptyView
                  canManage={canManage}
                  addingClass={addingClass}
                  setAddingClass={setAddingClass}
                  newClassName={newClassName}
                  setNewClassName={setNewClassName}
                  onAddClass={handleAddClass}
                />
              ) : sidebarMode === 'preview' ? (
                <PreviewView
                  album={album}
                  classes={classes}
                  teachers={teachers}
                  membersByClass={membersByClass}
                  firstPhotoByStudent={firstPhotoByStudent}
                  onPlayVideo={onPlayVideo}
                  onClose={() => effectiveAlbumId && router.push(getYearbookSectionQueryUrl(effectiveAlbumId, lastSectionBeforePreviewRef.current, pathname), { scroll: false })}
                />
              ) : sidebarMode === 'flipbook' ? (
                <FlipbookView
                  album={album}
                  manualPages={manualPages}
                  canManage={canManage}
                  flipbookPreviewMode={flipbookPreviewMode}
                  onPlayVideo={onPlayVideo}
                  onUpdateAlbum={props.handleUpdateAlbum}
                />
              ) : sidebarMode === 'classes' ? (
                /* Classes Content - Original grid view */
                (() => {
                  const access = myAccessByClass[currentClass.id]
                  const hasApprovedAccess = access?.status === 'approved'
                  const classMembers = membersByClass[currentClass.id] ?? []

                  return (
                    <div className="flex flex-col gap-4 py-3">
                      {/* Batch Photo Section - Prominent Header */}
                      <div className="bg-white/5 border-y border-white/10 overflow-hidden px-3 py-3 flex flex-col sm:flex-row items-center sm:items-center gap-4">
                        <div className="flex-1 order-2 sm:order-1 text-center sm:text-left w-full sm:w-auto">
                          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{currentClass.name}</h2>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-400">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">{classMembers.length} Anggota</span>
                          </div>
                        </div>

                        {/* Photo Section */}
                        <div className="relative group w-full sm:w-auto sm:max-w-md order-1 sm:order-2">
                          {currentClass.batch_photo_url ? (
                            <div className="relative w-full aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                              <img
                                src={currentClass.batch_photo_url}
                                alt={`Foto Angkatan ${currentClass.name}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setViewingBatchPhotoClass(currentClass)}
                              />
                              {canManage && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteBatchPhoto(currentClass.id)
                                    }}
                                    className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-all border border-white/10"
                                    title="Hapus Foto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            canManage ? (
                              <button
                                onClick={() => {
                                  setUploadingBatchPhotoClassId(currentClass.id)
                                  batchPhotoInputRef.current?.click()
                                }}
                                className="w-full flex flex-col items-center justify-center aspect-video p-6 rounded-lg border-2 border-dashed border-white/10 hover:border-lime-500/50 hover:bg-white/5 transition-all group"
                              >
                                <ImageIcon className="w-10 h-10 text-gray-500 group-hover:text-lime-400 mb-3 transition-colors" />
                                <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Upload Foto Angkatan</span>
                                <span className="text-[10px] text-muted mt-0.5">maks. 10MB</span>
                              </button>
                            ) : (
                              <div className="w-full aspect-video flex items-center justify-center rounded-lg border border-white/5 bg-white/[0.02]">
                                <span className="text-sm text-gray-500 italic">Belum ada foto angkatan</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Members Grid/List */}
                      {
                        classMembers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 opacity-60 min-h-[70vh] w-full px-3">
                            <Users className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-center text-sm lg:text-base">Belum ada anggota terdaftar di group ini.</p>
                          </div>
                        ) : classViewMode === 'list' ? (
                          <div className="space-y-1 px-3">
                            {classMembers.map((m, idx) => (
                              <div key={idx} className="flex flex-col p-1.5 lg:p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-app font-medium text-xs lg:text-sm truncate">{m.student_name}{m.is_me ? ' (Anda)' : ''}</p>
                                    {m.email && <p className="text-muted text-xs truncate">{m.email}</p>}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0 ml-2">
                                    <button type="button" onClick={() => openGallery(currentClass.id, m.student_name, currentClass.name)} className="px-2 py-1 text-xs rounded-lg border border-white/10 text-app hover:bg-white/5 flex-shrink-0">
                                      Lihat
                                    </button>
                                    {(canManage || (m.is_me && hasApprovedAccess)) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (canManage && !m.is_me && onStartEditMember) {
                                            setEditingProfileClassId(currentClass.id)
                                            setEditingMemberUserId?.(m.user_id)
                                            onStartEditMember(m, currentClass.id)
                                          } else if (m.is_me && onStartEditMyProfile) {
                                            setEditingProfileClassId(currentClass.id)
                                            setEditingMemberUserId?.(null)
                                            onStartEditMyProfile(currentClass.id)
                                            if (fetchStudentPhotosForCard) {
                                              fetchStudentPhotosForCard(currentClass.id, m.student_name)
                                            }
                                          }
                                        }}
                                        className="px-2 py-1 text-xs font-medium rounded-lg bg-lime-600/20 text-lime-400 hover:bg-lime-600/30 flex-shrink-0 flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" /> Edit
                                      </button>
                                    )}
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteMemberConfirm({ classId: currentClass.id, userId: m.is_me ? undefined : m.user_id, memberName: m.student_name })}
                                        className="p-1.5 text-xs font-medium rounded-lg text-red-400 hover:bg-red-600/20 transition-colors flex items-center gap-1"
                                        title="Hapus anggota"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 px-3">
                            {classMembers.map((m) => (
                              <MemberCard
                                key={m.user_id || m.student_name}
                                member={m as any}
                                firstPhoto={m.photos?.[0] || firstPhotoByStudent?.[m.student_name]}
                                classId={currentClass.id}
                                canManage={canManage}
                                hasApprovedAccess={hasApprovedAccess}
                                isFlipped={editingMemberUserId === m.user_id}
                                editPhotos={editingMemberUserId === m.user_id ? studentPhotosInCard : undefined}
                                onStartEdit={(member) => {
                                  setEditingProfileClassId(currentClass.id)
                                  setEditingMemberUserId?.(member.user_id)
                                  // Prepare states in case needed by other logic
                                  setEditProfileName(member.student_name || '')
                                  setEditProfileEmail(member.email || '')
                                  setEditProfileTtl(member.date_of_birth || '')
                                  setEditProfileInstagram(member.instagram || '')
                                  setEditProfilePesan(member.message || '')
                                  setEditProfileVideoUrl(member.video_url || '')

                                  if (fetchStudentPhotosForCard) {
                                    fetchStudentPhotosForCard(currentClass.id, member.student_name)
                                  }
                                }}
                                onCancelEdit={() => {
                                  setEditingProfileClassId(null)
                                  setEditingMemberUserId?.(null)
                                }}
                                onSave={async (data) => {
                                  setEditProfileName(data.student_name)
                                  setEditProfileEmail(data.email)
                                  setEditProfileTtl(data.date_of_birth)
                                  setEditProfileInstagram(data.instagram)
                                  setEditProfilePesan(data.message)
                                  setEditProfileVideoUrl(data.video_url)

                                  await handleSaveProfile?.(currentClass.id, false, m.user_id, data)
                                  setEditingMemberUserId?.(null)
                                  setEditingProfileClassId(null)
                                }}
                                onDeleteClick={() => setDeleteMemberConfirm({ classId: currentClass.id, userId: m.is_me ? undefined : m.user_id, memberName: m.student_name })}
                                onUploadPhoto={(cid, sname) => {
                                  if (fileInputRef.current) {
                                    uploadPhotoTargetRef.current = { classId: cid || currentClass.id, studentName: sname || m.student_name }
                                    fileInputRef.current.click()
                                  }
                                }}
                                onDeletePhoto={(pid, cid, sname) => {
                                  if (onDeletePhoto) onDeletePhoto(pid, cid || currentClass.id, sname || m.student_name)
                                }}
                                onUploadVideo={(cid, sname) => {
                                  if (videoInputRef.current) {
                                    uploadVideoTargetRef.current = { classId: cid || currentClass.id, studentName: sname || m.student_name }
                                    videoInputRef.current.click()
                                  }
                                }}
                                onPlayVideo={onPlayVideo}
                                onOpenGallery={(cid, sname) => openGallery(cid || currentClass.id, sname || m.student_name, currentClass.name)}
                                saving={savingProfile}
                              />
                            ))}
                          </div>
                        )}
                    </div>
                  )
                })()
              ) : null}
            </div>

            {/* Custom Confirmation Modals */}
            {
              deleteClassConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                  <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
                    <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Kelas</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Yakin ingin menghapus kelas "{deleteClassConfirm.className}"? Semua data member di dalamnya akan hilang.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setDeleteClassConfirm(null)} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium">Batal</button>
                      <button
                        onClick={() => {
                          handleDeleteClass(deleteClassConfirm.classId)
                          setDeleteClassConfirm(null)
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            {
              deleteMemberConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                  <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
                    <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Anggota</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Hapus "{deleteMemberConfirm.memberName}" dari kelas?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setDeleteMemberConfirm(null)} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium">Batal</button>
                      <button
                        onClick={async () => {
                          const targetUserId = deleteMemberConfirm.userId ?? currentUserId!
                          await handleDeleteClassMember(deleteMemberConfirm.classId, targetUserId)
                          setDeleteMemberConfirm(null)
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )
            }



            {/* Hidden Batch Photo Input */}
            <input
              type="file"
              ref={batchPhotoInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleUploadBatchPhoto}
            />

            {/* Batch Photo Viewer */}
            {
              viewingBatchPhotoClass && viewingBatchPhotoClass.batch_photo_url && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-medium text-lg">Foto Angkatan - {viewingBatchPhotoClass.name}</h3>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <button
                          onClick={() => handleDeleteBatchPhoto(viewingBatchPhotoClass.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewingBatchPhotoClass(null)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                    <img
                      src={viewingBatchPhotoClass.batch_photo_url}
                      alt={`Foto Angkatan ${viewingBatchPhotoClass.name}`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              )
            }
          </div>
        </div >
      </div >
    </div >
  )
}

