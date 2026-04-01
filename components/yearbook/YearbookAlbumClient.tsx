'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import BackLink from '@/components/dashboard/BackLink'
import { ChevronLeft, ChevronRight, BookOpen, ImagePlus, Video, Play, Users, Layout, Eye, Menu, MessageSquare, Book, Lock, Link as LinkIcon, Search, SearchX, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import YearbookClassesView from './YearbookClassesView'
import YearbookSkeleton, { isValidYearbookSection } from './components/YearbookSkeleton'
import { getSectionModeFromUrl, getYearbookSectionQueryUrl } from './lib/yearbook-paths'
import CreditBadgeTop from './components/CreditBadgeTop'
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'
import type { Album, ClassAccess, ClassMember, ClassRequest, Photo } from './types'
import { asString, asObject, asStringArray, asNumberRecord, getErrorMessage } from './utils/response-narrowing'
import { useYearbookUIState } from './hooks/useYearbookUIState'
import { useYearbookAlbumData } from './hooks/useYearbookAlbumData'
import { useYearbookFeatures } from './hooks/useYearbookFeatures'
import { useYearbookAccess } from './hooks/useYearbookAccess'
import { useYearbookMembers } from './hooks/useYearbookMembers'
import { useYearbookCoverState, useYearbookProfileEditState, useYearbookGalleryState } from './hooks/useYearbookUI'
import { useCurrentUserId } from './hooks/useCurrentUserId'
import { useYearbookSearchState } from './hooks/useYearbookSearchState'

export type YearbookAlbumClientProps = {
  backHref?: string
  backLabel?: string
  initialAlbum?: Album | null
  initialMembers?: Record<string, ClassMember[]>
  initialAccess?: { access: Record<string, ClassAccess | null>, requests: Record<string, ClassRequest | null> }
}

const AI_LABS_TOOLS = ['tryon', 'pose', 'image-editor', 'photogroup', 'phototovideo'] as const

export default function YearbookAlbumClient({
  backHref = '/user/albums',
  backLabel = 'Ke Album Saya',
  initialAlbum = null,
  initialMembers = {},
  initialAccess = { access: {}, requests: {} }
}: YearbookAlbumClientProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const id = params?.id as string | undefined
  const toolParam = searchParams.get('tool')
  const aiLabsTool = (toolParam && AI_LABS_TOOLS.includes(toolParam as any)) ? toolParam : null
  
  // Album Data: album state, loading, error, and fetch callback
  const { album, setAlbum, loading, error, fetchAlbum, handleUpdateAlbum, albumRef } = useYearbookAlbumData(id, initialAlbum)
  
  // UI State: view, classIndex, sidebarMode, classViewMode, personalIndex, etc. with localStorage persistence
  const { view, setView, classIndex, setClassIndex, sidebarMode, setSidebarMode, classViewMode, setClassViewMode, personalIndex, setPersonalIndex, flipbookPreviewMode, setFlipbookPreviewMode, mobileMenuOpen, setMobileMenuOpen, lastEditorSection, setLastEditorSection } = useYearbookUIState(id)

  // Features: feature unlocks, flipbook/ai-labs features by package
  const { featureUnlocks, setFeatureUnlocks, flipbookEnabledByPackage, setFlipbookEnabledByPackage, aiLabsFeaturesByPackage, setAiLabsFeaturesByPackage, featureCreditCosts, setFeatureCreditCosts, featureUnlocksLoaded, setFeatureUnlocksLoaded, fetchFeatureUnlocks } = useYearbookFeatures(id)

  // Access: my access/request state and admin requests
  const {
    myAccessByClass,
    setMyAccessByClass,
    myRequestByClass,
    setMyRequestByClass,
    accessDataLoaded,
    setAccessDataLoaded,
    requestsByClass,
    setRequestsByClass,
    selectedRequestId,
    setSelectedRequestId,
    fetchAllAccess: fetchAllAccessBase,
  } = useYearbookAccess(id, initialAccess)

  const {
    membersByClass,
    setMembersByClass,
    firstPhotoByStudentByClass,
    setFirstPhotoByStudentByClass,
    studentPhotosInCard,
    setStudentPhotosInCard,
    studentNameForPhotosInCard,
    setStudentNameForPhotosInCard,
    studentPhotoIndexInCard,
    setStudentPhotoIndexInCard,
  } = useYearbookMembers(id, initialMembers)

  const {
    photos,
    setPhotos,
    galleryStudent,
    setGalleryStudent,
    photoIndex,
    setPhotoIndex,
    touchStartX,
    setTouchStartX,
    personalCardExpanded,
    setPersonalCardExpanded,
  } = useYearbookGalleryState()

  const {
    editingProfileClassId,
    setEditingProfileClassId,
    editingMemberUserId,
    setEditingMemberUserId,
    editProfileName,
    setEditProfileName,
    editProfileEmail,
    setEditProfileEmail,
    editProfileTtl,
    setEditProfileTtl,
    editProfileInstagram,
    setEditProfileInstagram,
    editProfilePesan,
    setEditProfilePesan,
    editProfileVideoUrl,
    setEditProfileVideoUrl,
    savingProfile,
    setSavingProfile,
    lastUploadedVideoName,
    setLastUploadedVideoName,
  } = useYearbookProfileEditState()

  const {
    uploadingCover,
    setUploadingCover,
    coverPreview,
    setCoverPreview,
    coverPosition,
    setCoverPosition,
    uploadingCoverVideo,
    setUploadingCoverVideo,
    videoPopupUrl,
    setVideoPopupUrl,
    videoPopupError,
    setVideoPopupError,
    deleteCoverConfirm,
    setDeleteCoverConfirm,
  } = useYearbookCoverState()

  const currentUserId = useCurrentUserId()
  const {
    teacherSearchQuery,
    classMemberSearchQuery,
    openSearch,
    closeSearch,
    isSearchOpen,
    getSearchValue,
    setSearchValue,
  } = useYearbookSearchState()

  const fetchAllAccess = useCallback(() => fetchAllAccessBase(albumRef), [fetchAllAccessBase, albumRef])

  const [addingClass, setAddingClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [requestForm, setRequestForm] = useState<{ student_name: string; email: string }>({ student_name: '', email: '' })
  
  const galleryUploadInputRef = useRef<HTMLInputElement>(null)
  const coverUploadInputRef = useRef<HTMLInputElement>(null)
  const coverPreviewContainerRef = useRef<HTMLDivElement>(null)
  const coverDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const coverVideoInputRef = useRef<HTMLInputElement>(null)
  const [teacherCount, setTeacherCount] = useState<number>(0)
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0)
  const lastLocalUpdateRef = useRef<number>(0)
  const accessUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for stable access in callbacks without triggering recreations
  const [realtimeCounter, setRealtimeCounter] = useState(0)

  const isFetchingMembersRef = useRef(false)

  // Section dari URL: path segment atau query ?section=
  const sectionMode = getSectionModeFromUrl(pathname, searchParams.get('section'), id ?? '')
  const isCoverView = sectionMode === 'cover'
  const sidebarModeFromPath = sectionMode === 'cover' ? 'classes' : sectionMode

  // Optimistic section: state-driven agar klik sidebar instan (tanpa tunggu router)
  const [activeSection, setActiveSection] = useState<typeof sectionMode>(sectionMode)
  const latestClickedSectionRef = useRef<string | null>(null)

  useEffect(() => {
    if (latestClickedSectionRef.current) {
      if (latestClickedSectionRef.current === sectionMode) {
        // Router sudah berhasil catch up dengan klik terakhir
        latestClickedSectionRef.current = null
      } else {
        // URL telat (lagging) dari klik kita yang cepat.
        // Jangan timpa state optimis kita supaya tampilan tidak pindah-pindah (flip-flop).
        return
      }
    }
    setActiveSection(sectionMode)
  }, [sectionMode])

  useEffect(() => {
    setView(activeSection === 'cover' ? 'cover' : 'classes')
    setSidebarMode(activeSection === 'cover' ? 'classes' : activeSection)
    if (activeSection !== 'preview' && activeSection !== 'ai-labs') {
      setLastEditorSection(activeSection)
    }
  }, [activeSection])

  const handleSectionChange = useCallback(
    (section: typeof sectionMode) => {
      latestClickedSectionRef.current = section
      setActiveSection(section)
      setView(section === 'cover' ? 'cover' : 'classes')
      setSidebarMode(section === 'cover' ? 'classes' : section)
      if (section !== 'preview' && section !== 'ai-labs') setLastEditorSection(section)
      if (id && typeof window !== 'undefined') {
        const newUrl = getYearbookSectionQueryUrl(id, section, pathname)
        // Bypass Next.js router patching to prevent RSC network roundtrip and loading states!
        const nativePushState = window.history.constructor.prototype.pushState
        nativePushState.call(window.history, null, '', newUrl)
      }
    },
    [id, pathname]
  )

  // Simpan sidebarMode ke localStorage (untuk fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-sidebarMode-${id}`, sidebarModeFromPath)
    }
  }, [sidebarModeFromPath, id])

  // Saat URL punya ?tool=..., redirect ke path ai-labs
  useEffect(() => {
    if (aiLabsTool && id && sectionMode !== 'ai-labs') {
      router.replace(getYearbookSectionQueryUrl(id, 'ai-labs', pathname) + (searchParams.toString() ? `&${searchParams.toString()}` : ''), { scroll: false })
    }
  }, [aiLabsTool, id, sectionMode, router, searchParams])

  const currentClassId = album?.classes?.[classIndex]?.id
  const isOwner = album?.isOwner === true
  const isAlbumAdmin = album?.isAlbumAdmin === true

  // Role admin (global): "Kembali" selalu ke dashboard admin (setelah album tersedia)
  const isAdminPath = typeof pathname === 'string' && pathname.startsWith('/admin/')
  const isGlobalAdminUser = album?.isGlobalAdmin === true
  const useAdminBack = isAdminPath || isGlobalAdminUser

  const originalBackHref = useAdminBack ? '/admin/albums' : backHref
  const originalBackLabel = useAdminBack ? 'Ke Manajemen Album' : backLabel

  const effectiveBackHref = (sectionMode === 'preview' && lastEditorSection && id)
    ? getYearbookSectionQueryUrl(id, lastEditorSection as any, pathname)
    : originalBackHref

  const effectiveBackLabel = (sectionMode === 'preview' && lastEditorSection)
    ? 'Kembali ke Editor'
    : originalBackLabel

  // Background: Fetch all access data immediately (now efficient)
  // Background: Fetch all access data immediately (now efficient)
  useEffect(() => {
    if ((view !== 'classes' && view !== 'cover') || !id) return
    if (!initialAccess?.access || Object.keys(initialAccess.access).length === 0) {
      fetchAllAccess()
    }
  }, [view, id, fetchAllAccess, initialAccess])

  // Supabase auth-only: no Realtime, no polling.
  // Refetch when user returns to tab (helps keep classes/members up to date across devices).
  useEffect(() => {
    if (!id) return
    const onVisible = () => {
      fetchAlbum(true)
      fetchAllAccessRef.current()
      fetchAllClassMembersRef.current()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [id, fetchAlbum])

  // Optimized: Fetch ALL class members in one request
  const fetchAllClassMembers = useCallback(async () => {
    if (!id || isFetchingMembersRef.current) return
    try {
      isFetchingMembersRef.current = true
      const res = await fetchWithAuth(`/api/albums/${id}/all-class-members`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => [])

      const groupedMembers: Record<string, ClassMember[]> = {}

      // Initialize with empty arrays for all classes based on current album state
      const currentClasses = albumRef.current?.classes
      if (currentClasses) {
        currentClasses.forEach(c => {
          groupedMembers[c.id] = []
        })
      }

      if (res.ok && Array.isArray(data)) {
        data.forEach((m: any) => {
          const cid = m.class_id
          if (cid) {
            if (!groupedMembers[cid]) groupedMembers[cid] = []
            const { class_id, ...member } = m
            groupedMembers[cid].push(member)
          }
        })
      }

      // Merge: jangan timpa member is_me (baru daftar) kalau API belum mengembalikan row baru
      setMembersByClass((prev) => {
        const merged: Record<string, ClassMember[]> = {}
        for (const cid of Object.keys(groupedMembers)) {
          merged[cid] = [...(groupedMembers[cid] ?? [])]
        }
        for (const classId of Object.keys(prev)) {
          const list = prev[classId] ?? []
          const meMember = list.find((m) => m.is_me)
          if (!meMember) continue
          const fromApi = merged[classId] ?? []
          const hasMe = fromApi.some((m) => m.is_me || (meMember.user_id && m.user_id === meMember.user_id))
          if (!hasMe) {
            merged[classId] = [...fromApi, meMember]
          }
        }
        return merged
      })
      setAccessDataLoaded(true)
    } catch (e) {
      console.error('Error fetching members:', e)
    } finally {
      isFetchingMembersRef.current = false
    }
  }, [id])

  // Aliases for compatibility with existing handler logic (now optimized to fetch all)
  const fetchMembersForClass = useCallback((_classId: string) => fetchAllClassMembers(), [fetchAllClassMembers])
  const fetchMembersForAllClasses = useCallback((_classes: any) => fetchAllClassMembers(), [fetchAllClassMembers])



  const refetchAccessAndMembersRef = useRef<() => void>(() => { })
  const fetchAllAccessRef = useRef(fetchAllAccess)
  fetchAllAccessRef.current = fetchAllAccess
  const fetchAllClassMembersRef = useRef(fetchAllClassMembers)
  fetchAllClassMembersRef.current = fetchAllClassMembers

  useEffect(() => {
    if (!id) return
    refetchAccessAndMembersRef.current = () => {
      fetchAllAccessRef.current()
      fetchAllClassMembersRef.current()
    }
  }, [id, fetchAllAccess, fetchAllClassMembers])

  // Initial fetch
  useEffect(() => {
    if (!id || !album?.classes?.length) return
    if (!initialMembers || Object.keys(initialMembers).length === 0) {
      fetchAllClassMembers()
    }
  }, [id, album?.classes?.length, fetchAllClassMembers, initialMembers])

  // (Realtime removed)

  useEffect(() => {
    setPersonalIndex(0)
    setPersonalCardExpanded(false)
    setStudentPhotosInCard([])
    setStudentNameForPhotosInCard(null)
    setStudentPhotoIndexInCard(0)
  }, [currentClassId])

  // Auto-fetch members untuk kelas saat ini jika belum ada
  useEffect(() => {
    if (!currentClassId || !id) return

    const members = membersByClass[currentClassId] ?? []
    if (members.length === 0) {
      fetchMembersForClass(currentClassId)
    }
  }, [currentClassId, id, fetchMembersForClass])

  const fetchStudentPhotosForCard = useCallback(async (classId: string, studentName: string) => {
    if (!id) return
    try {
      // Get photos directly from membersByClass instead of fetching from album_photos
      const members = membersByClass[classId] || []
      const member = members.find(m => m.student_name === studentName)
      const photos = member?.photos || []

      // Convert photos array to Photo objects for compatibility
      const photoObjects = photos.map((url, index) => ({
        id: `${studentName}-${index}`,
        file_url: url,
        student_name: studentName,
      }))

      setStudentPhotosInCard(photoObjects)
      setStudentPhotoIndexInCard(0)
      setStudentNameForPhotosInCard(studentName)
    } catch {
      setStudentPhotosInCard([])
      setStudentNameForPhotosInCard(studentName)
    }
  }, [id, membersByClass])

  // Sync photos in card when members data changes (e.g. after delete/upload)
  useEffect(() => {
    if (studentNameForPhotosInCard && currentClassId) {
      fetchStudentPhotosForCard(currentClassId, studentNameForPhotosInCard)
    }
  }, [membersByClass, studentNameForPhotosInCard, currentClassId, fetchStudentPhotosForCard])

  useEffect(() => {
    if (!personalCardExpanded || !currentClassId || !id) return
    const members = membersByClass[currentClassId] ?? []
    const member = members[personalIndex]
    setStudentPhotosInCard([])
    setStudentPhotoIndexInCard(0)
    setStudentNameForPhotosInCard(null)
    if (member?.student_name) fetchStudentPhotosForCard(currentClassId, member.student_name)
    else setStudentNameForPhotosInCard(null)
  }, [personalCardExpanded, currentClassId, personalIndex, id, fetchStudentPhotosForCard])

  // Auto-fetch members untuk current class ketika pertama load atau switch class
  useEffect(() => {
    if (!currentClassId || !id) return
    const access = myAccessByClass[currentClassId]
    const canSeeMembers = isOwner || isAlbumAdmin || access?.status === 'approved'
    // Hanya fetch jika belum ada data members atau jika ada access tapi members belum di-fetch
    const members = membersByClass[currentClassId]
    if (canSeeMembers && !members) {
      fetchMembersForClass(currentClassId)
    }
  }, [currentClassId, id, isOwner, isAlbumAdmin, fetchMembersForClass, myAccessByClass, membersByClass])

  // Legacy: Fetch members untuk personal view mode (backup)
  useEffect(() => {
    if (classViewMode !== 'personal' || !currentClassId || !id) return
    const members = membersByClass[currentClassId] ?? []
    const access = myAccessByClass[currentClassId]
    const canSeeMembers = isOwner || access?.status === 'approved'
    if (members.length === 0 && canSeeMembers) fetchMembersForClass(currentClassId)
  }, [classViewMode, currentClassId, id, isOwner, fetchMembersForClass])

  const fetchFirstPhotosForClass = useCallback(async (classId: string) => {
    if (!id) return
    // Optimistic class IDs (temp-*) belum ada di D1, jadi jangan fetch untuk menghindari 404 noise.
    if (classId.startsWith('temp-')) return
    const res = await fetchWithAuth(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}`, { credentials: 'include', cache: 'no-store' })
    const list = await res.json().catch(() => []) as { student_name: string; file_url: string }[]
    if (!Array.isArray(list)) return
    const map: Record<string, string> = {}
    for (const p of list) {
      if (p.student_name && p.file_url && !map[p.student_name]) map[p.student_name] = p.file_url
    }
    setFirstPhotoByStudentByClass((prev) => ({ ...prev, [classId]: map }))
  }, [id])

  useEffect(() => {
    if (currentClassId && id) fetchFirstPhotosForClass(currentClassId)
  }, [currentClassId, id, fetchFirstPhotosForClass])



  // Fetch members data for all classes when view is 'classes' or 'cover' to populate counts
  useEffect(() => {
    if ((view === 'classes' || view === 'cover') && album?.classes?.length) {
      // Only fetch if we don't have data yet
      const hasData = album.classes.some(c => membersByClass[c.id] !== undefined)
      if (!hasData) {
        fetchMembersForAllClasses(album.classes)
      }
    }
  }, [view, album?.classes, fetchMembersForAllClasses, membersByClass])

  const openClasses = useCallback(async () => {
    setView('classes')
    if (album?.classes?.length) {
      setClassIndex(0)
      // fetchAllClassMembers populates both members and students lists
      await fetchAllClassMembers()
      // fetchAllAccess populates access and requests
      await fetchAllAccess()
    }
  }, [album?.classes?.length, fetchAllClassMembers, fetchAllAccess])

  const openGallery = useCallback(async (classId: string, studentName: string, className: string) => {
    setGalleryStudent({ classId, studentName, className })
    setView('gallery')
    setPhotoIndex(0)
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => [])
      setPhotos(Array.isArray(data) ? data : [])
    } catch {
      setPhotos([])
    }
  }, [id])

  const goPrevClass = () => setClassIndex((i) => Math.max(0, i - 1))
  const goNextClass = () => setClassIndex((i) => Math.min((album?.classes?.length ?? 1) - 1, i + 1))

  const handleDeleteClass = async (classId: string, className?: string) => {
    if (!id) return
    const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(getErrorMessage(data, 'Gagal menghapus kelas'))
      return
    }
    setAlbum((prev) => {
      if (!prev?.classes) return prev
      return { ...prev, classes: prev.classes.filter((c) => c.id !== classId) }
    })

    // Clean up members and access state for this class
    setMembersByClass((prev) => {
      const newState = { ...prev }
      delete newState[classId]
      return newState
    })
    setMyAccessByClass((prev) => {
      const newState = { ...prev }
      delete newState[classId]
      return newState
    })
    setMyRequestByClass((prev) => {
      const newState = { ...prev }
      delete newState[classId]
      return newState
    })

    setClassIndex((i) => {
      const len = (album?.classes?.length ?? 1) - 1
      if (len <= 0) return 0
      return Math.min(i, len - 1)
    })
  }

  const handleUpdateClass = async (classId: string, updates: { name?: string; sort_order?: number; batch_photo_url?: string }) => {
    if (!id) return null

    // Mark that we just did a local update
    lastLocalUpdateRef.current = Date.now()

    // Optimistic update - update UI immediately without waiting for server
    const optimisticUpdate = { id: classId, name: '', sort_order: 0, batch_photo_url: null as string | null }
    setAlbum((prev) => {
      if (!prev?.classes) return prev
      const currentClass = prev.classes.find(c => c.id === classId)
      if (!currentClass) return prev

      optimisticUpdate.name = updates.name !== undefined ? updates.name : currentClass.name
      optimisticUpdate.sort_order = updates.sort_order !== undefined ? updates.sort_order : (currentClass.sort_order ?? 0)
      // @ts-ignore
      optimisticUpdate.batch_photo_url = updates.batch_photo_url !== undefined ? updates.batch_photo_url : (currentClass.batch_photo_url ?? null)

      const newClasses = prev.classes
        // @ts-ignore
        .map((c) => (c.id === classId ? { ...c, ...updates } : c))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

      // Jika ada perubahan sort_order, update classIndex ke posisi baru
      if (updates.sort_order !== undefined) {
        const newIndex = newClasses.findIndex((c) => c.id === classId)
        if (newIndex !== -1 && newIndex !== classIndex) {
          setClassIndex(newIndex)
        }
      }

      return { ...prev, classes: newClasses }
    })

    // Background API call - fire and forget
    return fetchWithAuth(`/api/albums/${id}/classes/${classId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(res => {
      if (!res.ok) {
        // Revert on error
        fetchAlbum(true)
        return null
      }
      return optimisticUpdate
    }).catch(() => {
      // Revert on error
      fetchAlbum(true)
      return null
    })
  }

  const handleAddClass = async () => {
    if (!id || !newClassName.trim()) return

    const trimmedName = newClassName.trim()
    const tempId = `temp-${Date.now()}`
    const tempClass = {
      id: tempId,
      name: trimmedName,
      sort_order: album?.classes?.length ?? 0,
      student_count: 0
    }

    // Optimistic update - add class immediately
    setAlbum((prev) =>
      prev
        ? {
          ...prev,
          classes: [...(prev.classes ?? []), tempClass],
        }
        : prev
    )

    setRequestsByClass((prev) => ({ ...prev, [tempId]: [] }))

    // Close form
    setNewClassName('')
    setAddingClass(false)

    // Update last local update timestamp for realtime throttle
    lastLocalUpdateRef.current = Date.now()

    // Show success toast immediately
    toast.success(`Kelas "${trimmedName}" ditambahkan`)

    // Background API call
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/classes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Revert optimistic update on error
        toast.error(getErrorMessage(data, 'Gagal menambah kelas'))
        setAlbum((prev) =>
          prev
            ? {
              ...prev,
              classes: (prev.classes ?? []).filter(c => c.id !== tempId),
            }
            : prev
        )

        setRequestsByClass((prev) => {
          const newState = { ...prev }
          delete newState[tempId]
          return newState
        })
        return
      }

      const created = data as { id: string; name: string; sort_order?: number }

      // Replace temp class with real one
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            classes: (prev.classes ?? []).map(c =>
              c.id === tempId
                ? { id: created.id, name: created.name, sort_order: created.sort_order ?? c.sort_order, student_count: 0 }
                : c
            ),
          }
          : prev
      )

      // Update state with real ID

      setRequestsByClass((prev) => {
        const newState = { ...prev }
        newState[created.id] = newState[tempId] || []
        delete newState[tempId]
        return newState
      })

    } catch (error) {
      // Revert optimistic update on error
      toast.error('Gagal menambah kelas')
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            classes: (prev.classes ?? []).filter(c => c.id !== tempId),
          }
          : prev
      )

      setRequestsByClass((prev) => {
        const newState = { ...prev }
        delete newState[tempId]
        return newState
      })
    }
  }

  const handleRequestAccess = async (classId: string) => {
    if (!id || !requestForm.student_name.trim()) return
    
    // Snapshot values sebelum async call
    const studentName = requestForm.student_name.trim()
    const email = requestForm.email.trim() || undefined
    
    const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}/request`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_name: studentName, email }),
    })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal mengajukan akses'))
      return
    }
    
    const status = asString(data.status)
    // Response bisa dari album_class_access (approved) atau album_class_requests (pending request)
    if (status === 'approved') {
      const idValue = asString(data.id) ?? ''
      const emailValue = asString(data.email) ?? null
      const dateOfBirth = asString(data.date_of_birth) ?? null
      const instagram = asString(data.instagram) ?? null
      const message = asString(data.message) ?? null
      const videoUrl = asString(data.video_url) ?? null
      const userId = asString(data.user_id) ?? ''
      
      setMyAccessByClass((prev) => ({
        ...prev,
        [classId]: {
          id: idValue,
          student_name: studentName,
          email: emailValue,
          status: 'approved',
          date_of_birth: dateOfBirth,
          instagram,
          message,
          video_url: videoUrl
        }
      }))
      setMyRequestByClass((prev) => ({ ...prev, [classId]: null }))
      
      // Optimistic: tambah diri ke daftar member agar profil card langsung muncul
      setMembersByClass((prev) => {
        const list = prev[classId] ?? []
        const alreadyIn = list.some((m) => m.is_me)
        if (alreadyIn) return prev
        return {
          ...prev,
          [classId]: [
            ...list,
            {
              user_id: userId,
              student_name: studentName,
              email: email ?? null,
              date_of_birth: dateOfBirth,
              instagram,
              message,
              video_url: videoUrl,
              is_me: true
            } as ClassMember
          ]
        }
      })
      toast.success('Anda terdaftar di kelas ini.')
    } else {
      // pending request
      const idValue = asString(data.id) ?? ''
      setMyRequestByClass((prev) => ({
        ...prev,
        [classId]: {
          id: idValue,
          student_name: studentName,
          email: email ?? null,
          status: 'pending'
        }
      }))
      toast.success('Permintaan pendaftaran dikirim. Menunggu persetujuan.')
    }
    setRequestForm({ student_name: '', email: '' })
  }

  const handleApproveReject = async (classId: string, requestId: string, status: 'approved' | 'rejected') => {
    if (!id) return
    const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}/requests/${requestId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal'))
      return
    }
    // Remove request dari pending list
    setRequestsByClass((prev) => ({
      ...prev,
      [classId]: (prev[classId] ?? []).filter((r) => r.id !== requestId),
    }))
    // Jika approved, refresh members list untuk kelas ini
    if (status === 'approved') {

      // Fetch ulang members yang sudah approved
      await fetchMembersForClass(classId)
      toast.success('Permintaan disetujui! Member berhasil ditambahkan.')
    } else {
      toast.success('Permintaan ditolak.')
    }
  }

  const handleJoinAsOwner = async (classId: string) => {
    if (!id) return

    const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}/join-as-owner`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_name: '', // Bisa kosong, nanti diisi via edit
        email: ''
      }),
    })

    const data = asObject(await res.json().catch(() => ({})))

    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal bergabung ke kelas'))
      return
    }

    const access = asObject(data.access)
    const accessId = asString(access.id) ?? ''
    const accessStudentName = asString(access.student_name) ?? ''
    const accessEmail = asString(access.email) ?? null

    // Update state: tambahkan owner ke myAccessByClass dengan status approved
    setMyAccessByClass((prev) => ({
      ...prev,
      [classId]: {
        id: accessId,
        student_name: accessStudentName,
        email: accessEmail,
        status: 'approved'
      },
    }))

    // Optimistic: tambah owner ke daftar member agar profil card langsung muncul
    setMembersByClass((prev) => {
      const list = prev[classId] ?? []
      const accessUserId = asString(access.user_id)
      const alreadyIn = list.some((m) => m.is_me || (accessUserId ? m.user_id === accessUserId : false))
      if (alreadyIn) return prev
      return {
        ...prev,
        [classId]: [
          ...list,
          {
            user_id: asString(access.user_id) ?? '',
            student_name: accessStudentName,
            email: accessEmail,
            date_of_birth: null,
            instagram: null,
            message: null,
            video_url: null,
            is_me: true
          } as ClassMember
        ]
      }
    })

    // Auto-open edit form dengan nama default dari API (user_metadata / email / user_id)
    setEditingProfileClassId(classId)
    setEditProfileName(accessStudentName)
    setEditProfileEmail(accessEmail ?? '')
    setEditProfileTtl('')
    setEditProfileInstagram('')
    setEditProfilePesan('')
    setEditProfileVideoUrl('')

    // Jangan refetch di sini: API bisa belum mengembalikan row baru, sehingga list menimpa optimistic update dan card hilang. Realtime / navigasi akan sync nanti.
    toast.success('Berhasil! Silakan isi profil Anda.')
  }

  const handleSaveProfile = async (classId: string, deleteProfile: boolean = false, targetUserId?: string, overrideData?: any, skipCloseAndFetch?: boolean) => {
    if (!id) {
      toast.error('Album ID tidak ditemukan')
      return
    }
    if (!classId) {
      toast.error('Class ID tidak ditemukan')
      return
    }

    const isEditingOther = !!targetUserId
    const url = isEditingOther
      ? `/api/albums/${id}/classes/${classId}/members/${targetUserId}`
      : `/api/albums/${id}/classes/${classId}/my-access`

    if (deleteProfile) {
      setSavingProfile(true)
      try {
        const res = await fetchWithAuth(url, { method: 'DELETE', credentials: 'include' })
        const data = asObject(await res.json().catch(() => ({})))
        if (!res.ok) {
          toast.error(getErrorMessage(data, 'Gagal menghapus profil'))
          return
        }
        if (!isEditingOther) {
          setMyAccessByClass((prev) => ({ ...prev, [classId]: null }))
        }
        // Optimistic: hapus dari daftar agar card langsung hilang (hindari error akses tidak ditemukan)
        setMembersByClass((prev) => {
          const list = prev[classId] ?? []
          const next = isEditingOther && targetUserId
            ? list.filter((m) => m.user_id !== targetUserId)
            : list.filter((m) => !m.is_me)
          if (next.length === list.length) return prev
          return { ...prev, [classId]: next }
        })
        toast.success('Profil berhasil dihapus')
        setEditingProfileClassId(null)
        setEditingMemberUserId(null)
        await fetchMembersForClass(classId)
      } catch (error) {
        console.error('[handleSaveProfile] DELETE error:', error)
        toast.error('Gagal menghapus profil: ' + (error instanceof Error ? error.message : 'Network error'))
      } finally {
        setSavingProfile(false)
      }
      return
    }

    const dataToSave = overrideData ? {
      student_name: overrideData.student_name,
      email: overrideData.email,
      date_of_birth: overrideData.date_of_birth,
      instagram: overrideData.instagram,
      message: overrideData.message,
      video_url: overrideData.video_url
    } : {
      student_name: editProfileName,
      email: editProfileEmail,
      date_of_birth: editProfileTtl,
      instagram: editProfileInstagram,
      message: editProfilePesan,
      video_url: editProfileVideoUrl
    }

    if (!dataToSave.student_name?.trim()) {
      toast.error('Nama siswa wajib diisi')
      return
    }

    setSavingProfile(true)
    try {
      const res = await fetchWithAuth(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: dataToSave.student_name.trim(),
          email: dataToSave.email?.trim() || null,
          date_of_birth: dataToSave.date_of_birth?.trim() || null,
          instagram: dataToSave.instagram?.trim() || null,
          message: dataToSave.message?.trim() || null,
          video_url: dataToSave.video_url?.trim() || null,
        }),
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        toast.error(getErrorMessage(data, 'Gagal menyimpan'))
        return
      }
      const d = data as ClassAccess
      if (!isEditingOther) {
        setMyAccessByClass((prev) => ({
          ...prev,
          [classId]: prev[classId] ? {
            ...prev[classId]!,
            student_name: d.student_name,
            email: d.email ?? null,
            date_of_birth: d.date_of_birth ?? null,
            instagram: d.instagram ?? null,
            message: d.message ?? null,
            video_url: d.video_url ?? null
          } : null,
        }))
      }
      // Optimistic update: immediately reflect text changes in membersByClass
      const targetUid = isEditingOther ? targetUserId : currentUserId
      if (targetUid) {
        setMembersByClass(prev => {
          const list = prev[classId]
          if (!list) return prev
          const updated = list.map(m =>
            m.user_id === targetUid ? {
              ...m,
              student_name: d.student_name ?? m.student_name,
              email: d.email ?? null,
              date_of_birth: d.date_of_birth ?? null,
              instagram: d.instagram ?? null,
              message: d.message ?? null,
              video_url: d.video_url ?? m.video_url,
            } : m
          )
          return { ...prev, [classId]: updated }
        })
      }
      toast.success('Profil berhasil disimpan')
      if (!skipCloseAndFetch) {
        if (album?.classes) await fetchMembersForAllClasses(album.classes)
        setEditingProfileClassId(null)
        setEditingMemberUserId(null)
      }
    } catch (error) {
      console.error('[handleSaveProfile] PATCH error:', error)
      toast.error('Gagal menyimpan profil: ' + (error instanceof Error ? error.message : 'Network error'))
    } finally {
      setSavingProfile(false)
    }
  }

  const onStartEditMember = useCallback((member: ClassMember, classId: string) => {
    setEditingProfileClassId(classId)
    setEditingMemberUserId(member.user_id)
    setEditProfileName(member.student_name || '')
    setEditProfileEmail(member.email || '')
    setEditProfileTtl(member.date_of_birth || '')
    setEditProfileInstagram(member.instagram || '')
    setEditProfilePesan(member.message || '')
    setEditProfileVideoUrl(member.video_url || '')

    // Load photos for the member being edited
    if (member.student_name) {
      fetchStudentPhotosForCard(classId, member.student_name)
    }
  }, [fetchStudentPhotosForCard])

  const onStartEditMyProfile = useCallback((classId: string) => {
    setEditingMemberUserId(null)
    const access = myAccessByClass[classId]
    if (access) {
      setEditProfileName(access.student_name || '')
      setEditProfileEmail(access.email || '')
      setEditProfileTtl(access.date_of_birth || '')
      setEditProfileInstagram(access.instagram || '')
      setEditProfilePesan(access.message || '')
      setEditProfileVideoUrl(access.video_url || '')
    }
  }, [myAccessByClass])

  const handleUpdateRole = useCallback(async (userId: string, role: 'admin' | 'member') => {
    if (!id) return
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/members?user_id=${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        toast.error(getErrorMessage(data, 'Gagal mengubah role'))
        return
      }
      toast.success(`Role berhasil diubah menjadi ${role === 'admin' ? 'Admin' : 'Member'}`)
      // Refresh album to get updated member list (silent = no skeleton)
      await fetchAlbum(true)
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Gagal mengubah role')
    }
  }, [id, fetchAlbum])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!id) return
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/members?user_id=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        toast.error(getErrorMessage(data, 'Gagal menghapus member'))
        return
      }
      toast.success('Member berhasil dihapus dari album')
      // Refresh album to get updated member list (silent = no skeleton)
      await fetchAlbum(true)
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Gagal menghapus member')
    }
  }, [id, fetchAlbum])

  // Delete member from class with optimistic update (instant UI) + realtime for other devices
  const handleDeleteClassMember = useCallback(async (classId: string, userId: string) => {
    if (!id) return
    // Find the member's student_name before removal (for clearing photo cache)
    const memberToDelete = (membersByClass[classId] ?? []).find(m => m.user_id === userId)
    const deletedStudentName = memberToDelete?.student_name
    // Optimistic update: remove immediately from membersByClass
    setMembersByClass(prev => {
      const updated = { ...prev }
      if (updated[classId]) {
        updated[classId] = updated[classId].filter(m => m.user_id !== userId)
      }
      return updated
    })
    // Clear firstPhotoByStudentByClass for the deleted member so stale photos don't reappear
    if (deletedStudentName) {
      setFirstPhotoByStudentByClass(prev => {
        const classPhotos = prev[classId]
        if (!classPhotos || !(deletedStudentName in classPhotos)) return prev
        const updated = { ...classPhotos }
        delete updated[deletedStudentName]
        return { ...prev, [classId]: updated }
      })
    }
    // Also clear myAccessByClass for this class if it's the current user being removed
    if (userId === currentUserId) {
      setMyAccessByClass(prev => ({ ...prev, [classId]: null }))
    }
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        toast.error(getErrorMessage(data, 'Gagal menghapus anggota'))
        // Rollback: refetch to restore correct state
        await fetchAllClassMembers()
        await fetchAllAccess()
        // Also refetch photos to restore
        if (currentClassId) fetchFirstPhotosForClass(currentClassId)
        return
      }
      toast.success('Anggota berhasil dihapus dari kelas')
      // Refetch in background to sync with server (other devices get update via realtime)
      fetchAllClassMembers()
      fetchAllAccess()
      // Refetch first photos to ensure cache is fresh
      fetchFirstPhotosForClass(classId)
    } catch (err) {
      console.error('Error deleting class member:', err)
      toast.error('Gagal menghapus anggota')
      // Rollback on error
      await fetchAllClassMembers()
      await fetchAllAccess()
    }
  }, [id, currentUserId, fetchAllClassMembers, fetchAllAccess, membersByClass, currentClassId, fetchFirstPhotosForClass])

  const handleUploadPhoto = async (classId: string, studentName: string, className: string, file: File) => {
    if (!id) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Foto maksimal 10MB')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', classId)
    formData.append('student_name', studentName)
    const res = await fetchWithAuth(`/api/albums/${id}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal upload foto'))
      return
    }

    await fetchFirstPhotosForClass(classId)
    // Note: no fetchMembersForClass here — the caller (onSave flow) does a final fetch after all uploads complete.
    // Refresh preview: ambil daftar foto dari API agar langsung muncul (tanpa tunggu membersByClass)
    const resPhotos = await fetchWithAuth(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`, { credentials: 'include', cache: 'no-store' })
    const photoList = await resPhotos.json().catch(() => [])
    if (currentClassId === classId && studentNameForPhotosInCard === studentName && Array.isArray(photoList)) {
      const photoObjects = photoList.map((p: { id?: string; file_url: string; student_name?: string }, index: number) => ({
        id: p.id ?? `${studentName}-${index}`,
        file_url: p.file_url,
        student_name: p.student_name ?? studentName
      }))
      setStudentPhotosInCard(photoObjects)
      setStudentPhotoIndexInCard(0)
    }
  }

  const handleUploadVideo = async (classId: string, studentName: string, _className: string, file: File) => {
    if (!id) return
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video maksimal ${MAX_VIDEO_MB}MB`)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('student_name', studentName)
    const res = await fetchWithAuth(`/api/albums/${id}/classes/${classId}/video`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal upload video'))
      return
    }
    setLastUploadedVideoName(file.name)
    setTimeout(() => setLastUploadedVideoName(null), 5000)
    // Update the form field with the new video URL so it appears in the edit form
    const videoUrl = asString(data.video_url)
    if (videoUrl) {
      setEditProfileVideoUrl(videoUrl)
      // Optimistic update: immediately reflect video_url in membersByClass so the play icon shows
      setMembersByClass(prev => {
        const list = prev[classId]
        if (!list) return prev
        const updated = list.map(m =>
          m.student_name === studentName ? { ...m, video_url: videoUrl } : m
        )
        return { ...prev, [classId]: updated }
      })
    }
    // Note: no fetchMembersForClass here — optimistic update above is sufficient.
    // The caller (onSave flow) does a final fetchMembersForClass after all uploads complete.

  }

  const performDeleteCover = async () => {
    if (!id || !album?.cover_image_url) return
    const res = await fetchWithAuth(`/api/albums/${id}/cover`, { method: 'DELETE', credentials: 'include' })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      alert(getErrorMessage(data, 'Gagal menghapus cover'))
      return
    }
    setAlbum((prev) => prev ? { ...prev, cover_image_url: null, cover_image_position: null } : null)
  }

  const MAX_VIDEO_MB = 20
  const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB

  const handleUploadCoverVideo = async (file: File) => {
    if (!id) return
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Video maksimal ${MAX_VIDEO_MB}MB`)
      return
    }
    setUploadingCoverVideo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetchWithAuth(`/api/albums/${id}/cover-video`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        alert(getErrorMessage(data, 'Gagal upload video cover'))
        return
      }
      const coverVideoUrl = asString(data.cover_video_url) ?? null
      setAlbum((prev) => prev ? { ...prev, cover_video_url: coverVideoUrl } : null)
    } finally {
      setUploadingCoverVideo(false)
    }
  }

  const performDeleteCoverVideo = async () => {
    if (!id || !album?.cover_video_url) return
    const res = await fetchWithAuth(`/api/albums/${id}/cover-video`, { method: 'DELETE', credentials: 'include' })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      alert(getErrorMessage(data, 'Gagal menghapus video cover'))
      return
    }
    setAlbum((prev) => prev ? { ...prev, cover_video_url: null } : null)
  }

  const handleDeleteCover = async () => {
    setDeleteCoverConfirm('image')
  }
  const handleDeleteCoverVideo = async () => {
    setDeleteCoverConfirm('video')
  }

  const handleDeletePhoto = async (photoId: string, classId: string, studentName: string) => {
    if (!id) return
    // Extract index from photoId (format: studentName-index)
    const indexStr = photoId.split('-').pop()
    const index = parseInt(indexStr || '0', 10)

    if (isNaN(index)) {
      toast.error('Invalid photo ID')
      return
    }

    // Konfirmasi sudah dilakukan di UI component sebelum memanggil fungsi ini
    const res = await fetchWithAuth(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}&index=${index}`, { method: 'DELETE', credentials: 'include' })
    const data = asObject(await res.json().catch(() => ({})))
    if (!res.ok) {
      toast.error(getErrorMessage(data, 'Gagal menghapus foto'))
      return
    }
    toast.success('Foto berhasil dihapus')

    await fetchFirstPhotosForClass(classId)
    await fetchMembersForClass(classId)
    const members = membersByClass[currentClassId ?? ''] ?? []
    const viewingThisStudent = members[personalIndex]?.student_name === studentName
    if (viewingThisStudent) fetchStudentPhotosForCard(classId, studentName)
  }

  const handleUploadCover = async (
    file: File,
    position: { x: number; y: number },
    dataUrlToRevoke?: string
  ) => {
    if (!id) return
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Foto maksimal 10MB')
      return
    }
    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('position_x', String(position.x))
      formData.append('position_y', String(position.y))
      const res = await fetchWithAuth(`/api/albums/${id}/cover`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        alert(getErrorMessage(data, 'Gagal upload cover'))
        return
      }
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            cover_image_url: asString(data.cover_image_url) ?? '',
            cover_image_position: asString(data.cover_image_position) ?? prev.cover_image_position,
          }
          : null
      )
      if (dataUrlToRevoke) URL.revokeObjectURL(dataUrlToRevoke)
      setCoverPreview(null)
    } finally {
      setUploadingCover(false)
    }
  }

  const mobileFirstWrapper = `w-full mx-auto bg-white dark:bg-slate-950 lg:max-w-full flex flex-col ${sidebarModeFromPath === 'flipbook' && flipbookPreviewMode ? 'h-[100dvh]' : 'min-h-screen'}`
  const contentWrapper = 'max-w-[420px] md:max-w-full w-full mx-auto'

  if (!id) {
    return (
      <div className={mobileFirstWrapper}>
        <div className={`${contentWrapper} p-4`}>
          <p className="text-red-400 dark:text-red-300">ID album tidak valid.</p>
          <BackLink href={effectiveBackHref} />
        </div>
      </div>
    )
  }

  if (loading) {
    const sectionParam = searchParams.get('section')
    const skeletonSection = isValidYearbookSection(sectionParam)
      ? sectionParam
      : sectionMode
    return <YearbookSkeleton section={skeletonSection} />
  }

  if (error || !album) {
    return (
      <div className={mobileFirstWrapper}>
        <div className={`${contentWrapper} p-4 pb-6`}>
          <BackLink href={effectiveBackHref} />
          <p className="text-red-400 dark:text-red-300 mt-4">{error ?? 'Album tidak ditemukan.'}</p>
          <p className="text-muted dark:text-slate-400 text-sm mt-2">Pastikan album sudah disetujui (approved) dan Anda memiliki akses.</p>
        </div>
      </div>
    )
  }

  if (view === 'cover' || view === 'classes') {
    const isCoverView = activeSection === 'cover'
    const showBackLink = true
    const currentClass = album?.classes?.[classIndex]
    const aiLabsToolLabel: Record<string, string> = { tryon: 'Virtual Try On', pose: 'Pose', 'image-editor': 'Image Editor', photogroup: 'Photo Group', phototovideo: 'Photo to Video' }
    const isAiLabsToolActive = sidebarMode === 'ai-labs' && !!aiLabsTool
    const aiLabsBackHref = album?.id ? (useAdminBack ? `/admin/album/yearbook/${album.id}?section=ai-labs` : `/user/album/yearbook/${album.id}?section=ai-labs`) : effectiveBackHref
    const sectionTitle =
      isCoverView ? 'Cover'
        : sidebarMode === 'ai-labs' ? (aiLabsTool ? (aiLabsToolLabel[aiLabsTool] ?? 'AI Labs') : 'AI Labs')
          : sidebarMode === 'sambutan' ? 'Sambutan'
            : sidebarMode === 'classes' ? (currentClass?.name ?? 'Kelas')
              : sidebarMode === 'approval' ? 'Approval'
                : sidebarMode === 'flipbook' ? 'Flipbook'
                  : sidebarMode === 'preview' ? 'Preview'
                    : ''
    const sectionSubtitle =
      isCoverView ? 'Tampilan cover dan pengaturan cover album.'
        : sidebarMode === 'ai-labs' ? (aiLabsTool ? '' : 'Pilih fitur yang ingin digunakan. Semua fitur AI tersedia di sini.')
          : sidebarMode === 'sambutan' ? 'Kartu sambutan dan profil.'
            : sidebarMode === 'classes' ? (currentClass ? 'Profil dan foto anggota kelas.' : 'Daftar kelas dan anggota.')
              : sidebarMode === 'approval' ? 'Persetujuan siswa & manajemen tim album.'
                : sidebarMode === 'flipbook' ? 'Editor dan preview flipbook.'
                  : sidebarMode === 'preview' ? 'Preview tampilan album yearbook.'
                    : ''

    const headerCount =
      sidebarMode === 'classes' && !isCoverView && currentClass
        ? (membersByClass[currentClass.id]?.length ?? currentClass.student_count ?? 0)
        : sidebarMode === 'sambutan'
          ? teacherCount
          : sidebarMode === 'team'
            ? teamMemberCount
            : null

    return (
      <div className={mobileFirstWrapper}>
        {/* Sticky Header - BackLink + judul section sejajar (mobile + desktop) */}
        {showBackLink && (
          <div className="flex sticky top-0 z-50 bg-amber-300 dark:bg-slate-900 border-b-2 border-slate-900 dark:border-slate-700 px-3 lg:px-4 h-14 items-center gap-3 lg:gap-4 shadow-[0_2.5px_0_0_#0f172a] dark:shadow-[0_2.5px_0_0_#334155]">
            {/* Mobile: compact back arrow */}
            <Link href={isAiLabsToolActive ? aiLabsBackHref : effectiveBackHref} className="lg:hidden inline-flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            {/* Desktop: full BackLink (tetap di kiri, tanpa margin bawah agar sejajar vertikal) */}
            <div className="hidden lg:flex items-center">
              {isAiLabsToolActive ? (
                <BackLink href={aiLabsBackHref} label="Ke Daftar Fitur" className="!mb-0" />
              ) : (
                <BackLink href={effectiveBackHref} label={effectiveBackLabel} className="!mb-0" />
              )}
            </div>
            {sectionTitle && (
              <>
                {/* Mobile: title left-aligned */}
                <div className="lg:hidden flex-1 min-w-0">
                  <h1 className="text-base font-black text-slate-900 dark:text-white truncate max-w-full text-left uppercase tracking-tight leading-none">{sectionTitle}</h1>
                </div>
                {/* Desktop: title centered */}
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-center min-w-0 max-w-[50%]">
                  <div className="flex items-center justify-center gap-3">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{sectionTitle}</h1>
                    {headerCount !== null && headerCount !== undefined && (
                      <span className="px-3 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-black shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                        {headerCount}
                      </span>
                    )}
                  </div>
                  {sectionSubtitle && <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate uppercase tracking-wider">{sectionSubtitle}</p>}
                </div>
              </>
            )}

            {/* Header Actions (Right) */}
            <div className="ml-auto flex items-center gap-2 pr-1 lg:pr-2">
              {/* Credits badge: keep mounted to avoid resetting to 0 on tab switch */}
              <div className={(sidebarMode === 'ai-labs' || (sidebarMode === 'flipbook' && featureUnlocksLoaded && !(flipbookEnabledByPackage || featureUnlocks.includes('flipbook')))) ? '' : 'invisible pointer-events-none'}>
                <CreditBadgeTop />
              </div>
              {/* Flipbook Controls (Mobile & Desktop) */}
              {sidebarMode === 'flipbook' && (isOwner || isAlbumAdmin) && (featureUnlocksLoaded ? (flipbookEnabledByPackage || featureUnlocks.includes('flipbook')) : true) && (
                <div className="flex bg-white dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border-2 border-slate-900 dark:border-slate-600 gap-0.5 sm:gap-1 items-center shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155]">
                  <button
                    onClick={() => setFlipbookPreviewMode(false)}
                    className={`flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all ${!flipbookPreviewMode ? 'bg-indigo-400 text-white border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <Layout className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Editor</span>
                  </button>
                  <button
                    onClick={() => setFlipbookPreviewMode(true)}
                    className={`flex items-center justify-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black uppercase transition-all ${flipbookPreviewMode ? 'bg-indigo-400 text-white border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Preview</span>
                  </button>
                </div>
              )}
              {/* Sambutan & Classes: Search Toggle */}
              {(sidebarMode === 'sambutan' || (sidebarMode === 'classes' && activeSection !== 'cover')) && (
                <>
                  {isSearchOpen(sidebarMode === 'sambutan' ? 'sambutan' : 'classes') ? (
                    <div className={`absolute left-[52px] ${sidebarMode === 'classes' ? 'right-[52px]' : 'right-2'} top-2 bottom-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-xl px-3 flex items-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] lg:static lg:w-auto lg:h-9 lg:px-2 lg:py-1 animate-in slide-in-from-right-2 duration-200 z-[60]`}>
                      <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Cari..."
                        value={getSearchValue(sidebarMode === 'sambutan' ? 'sambutan' : 'classes')}
                        onChange={(e) => setSearchValue(sidebarMode === 'sambutan' ? 'sambutan' : 'classes', e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white min-w-0 dark:placeholder:text-slate-500"
                        autoFocus
                      />
                      <button
                        onClick={() => closeSearch(sidebarMode === 'sambutan' ? 'sambutan' : 'classes')}
                        className="ml-1 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                      >
                        <SearchX className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openSearch(sidebarMode === 'sambutan' ? 'sambutan' : 'classes')}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-lg sm:rounded-xl text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
                    </button>
                  )}
                </>
              )}

              {sidebarMode === 'classes' && activeSection !== 'cover' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMobileMenuOpen(true)
                  }}
                  className="lg:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-lg sm:rounded-xl text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all flex-shrink-0"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Mobile: Cover View Actions - Icon Only */}
            {activeSection === 'cover' && (isOwner || isAlbumAdmin || isGlobalAdminUser) && (
              <div className="lg:hidden ml-auto flex items-center gap-1.5 sm:gap-2 pr-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `${window.location.origin}/album/${album?.id}/preview`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link berhasil disalin');
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-lg sm:rounded-xl text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Salin Link"
                >
                  <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
                </button>
                <Link
                  href={`/album/${album?.id}/preview`}
                  target="_blank"
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-emerald-400 dark:bg-emerald-600 border-2 border-slate-900 dark:border-slate-600 rounded-lg sm:rounded-xl text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Mobile Persistent Edit Navigation - Cover, Sambutan, Kelas saja; Flipbook ada di bottom nav */}
        {((['classes', 'sambutan'].includes(sidebarMode) || activeSection === 'cover')) && !isAiLabsToolActive && (
          <div className="lg:hidden sticky top-14 z-40 bg-transparent px-3 sm:px-4 pt-0 pb-0">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1.5 sm:py-2">
              <button
                onClick={() => handleSectionChange('cover')}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all ${activeSection === 'cover' ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <BookOpen className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeSection === 'cover' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Cover</span>
              </button>
              <button
                onClick={() => handleSectionChange('sambutan')}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all ${sidebarMode === 'sambutan' ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <MessageSquare className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${sidebarMode === 'sambutan' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Sambutan</span>
              </button>
              <button
                onClick={() => handleSectionChange('classes')}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all ${sidebarMode === 'classes' && activeSection !== 'cover' ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${sidebarMode === 'classes' && activeSection !== 'cover' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Kelas</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`${contentWrapper} h-full flex flex-col`}>
          <YearbookClassesView
            album={album}
            classIndex={classIndex}
            setClassIndex={setClassIndex}

            setView={setView}
            isOwner={isOwner}
            isAlbumAdmin={isAlbumAdmin}
            isGlobalAdmin={album?.isGlobalAdmin}
            addingClass={addingClass}
            setAddingClass={setAddingClass}
            newClassName={newClassName}
            setNewClassName={setNewClassName}
            handleAddClass={handleAddClass}
            handleDeleteClass={handleDeleteClass}
            goPrevClass={goPrevClass}
            goNextClass={goNextClass}
            realtimeCounter={realtimeCounter}
            requestsByClass={requestsByClass}
            myAccessByClass={myAccessByClass}
            myRequestByClass={myRequestByClass}
            accessDataLoaded={accessDataLoaded}
            selectedRequestId={selectedRequestId}
            setSelectedRequestId={setSelectedRequestId}
            sidebarMode={activeSection === 'cover' ? 'classes' : activeSection}
            setSidebarMode={setSidebarMode}
            onSectionChange={handleSectionChange}
            albumId={id ?? ''}
            flipbookPreviewMode={flipbookPreviewMode}
            setFlipbookPreviewMode={setFlipbookPreviewMode}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            aiLabsTool={aiLabsTool}
            requestForm={requestForm}
            setRequestForm={setRequestForm}
            handleRequestAccess={handleRequestAccess}
            handleJoinAsOwner={handleJoinAsOwner}
            handleApproveReject={handleApproveReject}
            editingProfileClassId={editingProfileClassId}
            setEditingProfileClassId={setEditingProfileClassId}
            editingMemberUserId={editingMemberUserId}
            setEditingMemberUserId={setEditingMemberUserId}
            onStartEditMember={onStartEditMember}
            onStartEditMyProfile={onStartEditMyProfile}
            editProfileName={editProfileName}
            setEditProfileName={setEditProfileName}
            editProfileEmail={editProfileEmail}
            setEditProfileEmail={setEditProfileEmail}
            editProfileTtl={editProfileTtl}
            setEditProfileTtl={setEditProfileTtl}
            editProfileInstagram={editProfileInstagram}
            setEditProfileInstagram={setEditProfileInstagram}
            editProfilePesan={editProfilePesan}
            setEditProfilePesan={setEditProfilePesan}
            editProfileVideoUrl={editProfileVideoUrl}
            setEditProfileVideoUrl={setEditProfileVideoUrl}
            handleSaveProfile={handleSaveProfile}
            savingProfile={savingProfile}
            membersByClass={membersByClass}
            classViewMode={classViewMode}
            setClassViewMode={setClassViewMode}
            personalIndex={personalIndex}
            setPersonalIndex={setPersonalIndex}
            fetchMembersForClass={fetchMembersForClass}
            openGallery={openGallery}
            onUploadPhoto={handleUploadPhoto}
            onUploadVideo={handleUploadVideo}
            onDeletePhoto={handleDeletePhoto}
            touchStartX={touchStartX}
            setTouchStartX={setTouchStartX}
            personalCardExpanded={personalCardExpanded}
            setPersonalCardExpanded={setPersonalCardExpanded}
            firstPhotoByStudent={firstPhotoByStudentByClass[currentClassId ?? ''] ?? {}}
            studentPhotosInCard={studentPhotosInCard}
            studentNameForPhotosInCard={studentNameForPhotosInCard}
            studentPhotoIndexInCard={studentPhotoIndexInCard}
            setStudentPhotoIndexInCard={setStudentPhotoIndexInCard}
            lastUploadedVideoName={lastUploadedVideoName}
            onPlayVideo={(url) => {
              setVideoPopupError(null)
              setVideoPopupUrl(url)
            }}
            fetchStudentPhotosForCard={fetchStudentPhotosForCard}
            handleUpdateClass={handleUpdateClass}
            handleUpdateAlbum={handleUpdateAlbum}
            // Cover View Props (pakai state optimis agar langsung berubah tanpa delay URL)
            isCoverView={activeSection === 'cover'}
            uploadingCover={uploadingCover}
            coverPreview={coverPreview}
            setCoverPreview={setCoverPreview}
            coverPosition={coverPosition}
            setCoverPosition={setCoverPosition}
            handleUploadCover={handleUploadCover}
            handleDeleteCover={handleDeleteCover}
            handleUploadCoverVideo={handleUploadCoverVideo}
            handleDeleteCoverVideo={handleDeleteCoverVideo}
            uploadingCoverVideo={uploadingCoverVideo}
            currentUserId={currentUserId}
            handleUpdateRole={handleUpdateRole}
            handleRemoveMember={handleRemoveMember}
            handleDeleteClassMember={handleDeleteClassMember}
            fetchAlbum={fetchAlbum}
            onTeacherCountChange={setTeacherCount}
            onTeamMemberCountChange={setTeamMemberCount}
            featureUnlocks={featureUnlocks}
            flipbookEnabledByPackage={flipbookEnabledByPackage}
            featureUnlocksLoaded={featureUnlocksLoaded}
            aiLabsFeaturesByPackage={aiLabsFeaturesByPackage}
            featureCreditCosts={featureCreditCosts}
            onFeatureUnlocked={fetchFeatureUnlocks}
            effectiveBackHref={effectiveBackHref}
            teacherSearchQuery={teacherSearchQuery}
            classMemberSearchQuery={classMemberSearchQuery}
          />
        </div>
        {deleteCoverConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 lg:p-8 max-w-sm w-full shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] text-center">
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                {deleteCoverConfirm === 'image' ? 'Hapus Foto Cover' : 'Hapus Video Cover'}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 lowercase first-letter:uppercase">
                {deleteCoverConfirm === 'image' ? 'Yakin hapus foto cover?' : 'Yakin hapus video cover?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteCoverConfirm(null)}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    if (deleteCoverConfirm === 'image') await performDeleteCover()
                    else await performDeleteCoverVideo()
                    setDeleteCoverConfirm(null)
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 border-2 border-slate-900 dark:border-slate-700 text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
        {videoPopupUrl && id && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setVideoPopupUrl(null); setVideoPopupError(null) }}>
            <button
              onClick={(e) => { e.stopPropagation(); setVideoPopupUrl(null); setVideoPopupError(null) }}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 rounded-xl flex items-center justify-center shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-slate-900 dark:text-white"
            >
              <X className="w-6 h-6" strokeWidth={3} />
            </button>
            <div className="relative w-full max-w-2xl rounded-[32px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="aspect-video bg-black rounded-[24px] overflow-hidden">
                <video
                  src={apiUrl(`/api/albums/${id}/video-play?url=${encodeURIComponent(videoPopupUrl)}`)}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => setVideoPopupError('Video tidak dapat dimuat')}
                  onEnded={() => { setVideoPopupUrl(null); setVideoPopupError(null) }}
                />
              </div>

              {videoPopupError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 p-6 text-center">
                  <p className="text-sm font-black text-red-500 uppercase tracking-widest mb-4">{videoPopupError}</p>
                  <button
                    type="button"
                    onClick={() => { setVideoPopupUrl(null); setVideoPopupError(null) }}
                    className="px-6 py-3 bg-red-500 text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {coverPreview && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 rounded-[32px] p-4 shadow-[16px_16px_0_0_#0f172a] dark:shadow-[16px_16px_0_0_#334155] max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest bg-amber-400 dark:bg-amber-600 px-3 py-1 border-2 border-slate-900 dark:border-slate-600 rounded-lg shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">PENYESUAIAN COVER</p>
                <button
                  onClick={() => { URL.revokeObjectURL(coverPreview.dataUrl); setCoverPreview(null) }}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>

              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-tight">Geser gambar agar posisi pas, lalu klik Terapkan.</p>

              <div
                ref={coverPreviewContainerRef}
                className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 relative touch-none select-none shadow-[8px_8px_0_0_#f1f5f9] dark:shadow-[8px_8px_0_0_#334155]"
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  coverDragRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPosX: coverPosition.x,
                    startPosY: coverPosition.y,
                  }
                    ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                  if (!coverDragRef.current) return
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
                  coverDragRef.current = null
                    ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
                }}
              >
                <img
                  src={coverPreview.dataUrl}
                  alt="Preview cover"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(coverPreview.dataUrl)
                    setCoverPreview(null)
                  }}
                  className="flex-1 px-5 py-3.5 rounded-xl border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-x-1 active:translate-y-1 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => handleUploadCover(coverPreview.file, coverPosition, coverPreview.dataUrl)}
                  className="flex-3 px-8 py-3.5 rounded-xl bg-violet-500 text-white border-4 border-slate-900 dark:border-slate-700 font-black text-sm uppercase tracking-widest shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 transition-all disabled:opacity-50"
                >
                  {uploadingCover ? 'Mengunggah…' : 'Terapkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (view === 'gallery' && galleryStudent) {
    const hasPhotos = photos.length > 0
    const currentPhoto = hasPhotos ? photos[photoIndex] : null
    const isOwnGallery = myAccessByClass[galleryStudent.classId]?.student_name === galleryStudent.studentName
    const canUpload = isOwnGallery || isOwner
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex-wrap shadow-sm">
          <button
            type="button"
            onClick={() => { setView('classes'); setGalleryStudent(null); setPhotos([]) }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 font-semibold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Kembali
          </button>
          <span className="text-gray-800 dark:text-white font-bold truncate max-w-[40%]">{galleryStudent.studentName} — {galleryStudent.className}</span>
          <span className="text-gray-400 dark:text-slate-400 text-sm font-semibold">{hasPhotos ? `${photoIndex + 1}/${photos.length}` : '0'}</span>
          {isOwnGallery && (
            <>
              <input
                ref={galleryUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && galleryStudent) {
                    handleUploadPhoto(galleryStudent.classId, galleryStudent.studentName, galleryStudent.className, file)
                  }
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => galleryUploadInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-all shadow-sm"
              >
                <ImagePlus className="w-4 h-4" /> Upload foto
              </button>
            </>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
          {hasPhotos ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                disabled={photoIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <img src={currentPhoto?.file_url} alt="" className="max-w-full max-h-full object-contain" />
              <button
                type="button"
                onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
                disabled={photoIndex >= photos.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          ) : (
            <div className="text-center text-muted p-6">
              <p>Belum ada foto untuk siswa ini.</p>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => galleryUploadInputRef.current?.click()}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-all shadow-sm"
                >
                  <ImagePlus className="w-4 h-4" /> Upload foto
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
