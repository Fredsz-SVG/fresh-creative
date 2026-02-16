'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BackLink from '@/components/dashboard/BackLink'
import { ChevronLeft, ChevronRight, BookOpen, ImagePlus, Video, Play, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import YearbookClassesView from './YearbookClassesView'

type Album = {
  id: string
  name: string
  type: string
  status?: string
  cover_image_url?: string | null
  cover_image_position?: string | null
  cover_video_url?: string | null
  description?: string | null
  flipbook_bg_cover?: string | null
  flipbook_bg_sambutan?: string | null
  sambutan_font_family?: string | null
  sambutan_title_color?: string | null
  sambutan_text_color?: string | null
  isOwner?: boolean
  isAlbumAdmin?: boolean
  isGlobalAdmin?: boolean
  flipbook_mode?: string | null
  classes: { id: string; name: string; sort_order: number; student_count: number; batch_photo_url?: string | null; flipbook_bg_url?: string | null; flipbook_font_family?: string | null; flipbook_title_color?: string | null; flipbook_text_color?: string | null }[]
}

type ClassAccess = { id: string; student_name: string; email?: string | null; status: string; date_of_birth?: string | null; instagram?: string | null; message?: string | null; video_url?: string | null }
type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }
type ClassMember = { user_id: string; student_name: string; email: string | null; date_of_birth: string | null; instagram: string | null; message: string | null; video_url: string | null; photos?: string[]; is_me?: boolean; status?: string }

type Photo = { id: string; file_url: string; student_name: string; created_at?: string }

export type YearbookAlbumClientProps = {
  backHref?: string
  backLabel?: string
  initialAlbum?: Album | null
  initialMembers?: Record<string, ClassMember[]>
  initialAccess?: { access: Record<string, ClassAccess | null>, requests: Record<string, ClassRequest | null> }
}

const AI_LABS_TOOLS = ['tryon', 'pose', 'image-editor', 'photogroup', 'phototovideo'] as const

export default function YearbookAlbumClient({
  backHref = '/user/portal/albums',
  backLabel = 'Ke Album Saya',
  initialAlbum = null,
  initialMembers = {},
  initialAccess = { access: {}, requests: {} }
}: YearbookAlbumClientProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string | undefined
  const toolParam = searchParams.get('tool')
  const aiLabsTool = (toolParam && AI_LABS_TOOLS.includes(toolParam as any)) ? toolParam : null
  const [album, setAlbum] = useState<Album | null>(initialAlbum || null)
  const [loading, setLoading] = useState(!initialAlbum)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'cover' | 'classes' | 'gallery'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`yearbook-view-${id}`)
      return (saved as 'cover' | 'classes' | 'gallery') || 'cover'
    }
    return 'cover'
  })
  const [classIndex, setClassIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`yearbook-classIndex-${id}`)
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })

  const [photos, setPhotos] = useState<Photo[]>([])
  const [galleryStudent, setGalleryStudent] = useState<{ classId: string; studentName: string; className: string } | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [addingClass, setAddingClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [myAccessByClass, setMyAccessByClass] = useState<Record<string, ClassAccess | null>>(initialAccess?.access || {})
  const [myRequestByClass, setMyRequestByClass] = useState<Record<string, ClassRequest | null>>(initialAccess?.requests || {})
  const [accessDataLoaded, setAccessDataLoaded] = useState(!!initialAccess?.access && Object.keys(initialAccess.access).length > 0)
  const [requestsByClass, setRequestsByClass] = useState<Record<string, ClassRequest[]>>({})
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [sidebarMode, setSidebarMode] = useState<'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook'>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-sidebarMode-${id}`)
      return (saved as 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook') || 'classes'
    }
    return 'classes'
  })
  const [requestForm, setRequestForm] = useState<{ student_name: string; email: string }>({ student_name: '', email: '' })
  const [membersByClass, setMembersByClass] = useState<Record<string, ClassMember[]>>(initialMembers || {})
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
  const [editingProfileClassId, setEditingProfileClassId] = useState<string | null>(null)
  const [editingMemberUserId, setEditingMemberUserId] = useState<string | null>(null)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileEmail, setEditProfileEmail] = useState('')
  const [editProfileTtl, setEditProfileTtl] = useState('')
  const [editProfileInstagram, setEditProfileInstagram] = useState('')
  const [editProfilePesan, setEditProfilePesan] = useState('')
  const [editProfileVideoUrl, setEditProfileVideoUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [personalCardExpanded, setPersonalCardExpanded] = useState(false)
  const [firstPhotoByStudentByClass, setFirstPhotoByStudentByClass] = useState<Record<string, Record<string, string>>>({})
  const [studentPhotosInCard, setStudentPhotosInCard] = useState<Photo[]>([])
  const [studentNameForPhotosInCard, setStudentNameForPhotosInCard] = useState<string | null>(null)
  const [studentPhotoIndexInCard, setStudentPhotoIndexInCard] = useState(0)
  const galleryUploadInputRef = useRef<HTMLInputElement>(null)
  const coverUploadInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPreview, setCoverPreview] = useState<{ file: File; dataUrl: string } | null>(null)
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 })
  const coverPreviewContainerRef = useRef<HTMLDivElement>(null)
  const coverDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const coverVideoInputRef = useRef<HTMLInputElement>(null)
  const [lastUploadedVideoName, setLastUploadedVideoName] = useState<string | null>(null)
  const [videoPopupUrl, setVideoPopupUrl] = useState<string | null>(null)
  const [videoPopupError, setVideoPopupError] = useState<string | null>(null)
  const [uploadingCoverVideo, setUploadingCoverVideo] = useState(false)
  const [teacherCount, setTeacherCount] = useState<number>(0)
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const lastLocalUpdateRef = useRef<number>(0)
  const accessUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for stable access in callbacks without triggering recreations
  const [realtimeCounter, setRealtimeCounter] = useState(0)
  const albumRef = useRef(album)
  useEffect(() => { albumRef.current = album }, [album])

  const isFetchingMembersRef = useRef(false)
  const isFetchingAccessRef = useRef(false)

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    fetchCurrentUser()
  }, [])

  const fetchAlbum = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/albums/${id}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Album tidak ditemukan')
        setAlbum(null)
        return
      }
      if (data.type !== 'yearbook') {
        setError('Bukan album yearbook')
        setAlbum(null)
        return
      }
      setAlbum(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!initialAlbum) fetchAlbum()
  }, [fetchAlbum, initialAlbum])

  // Simpan view ke localStorage ketika berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-view-${id}`, view)
    }
  }, [view, id])

  // Simpan classIndex ke localStorage ketika berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-classIndex-${id}`, String(classIndex))
    }
  }, [classIndex, id])

  // Simpan sidebarMode ke localStorage ketika berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-sidebarMode-${id}`, sidebarMode)
    }
  }, [sidebarMode, id])

  // Saat URL punya ?tool=..., tetap di section AI Labs (sidebar album)
  useEffect(() => {
    if (aiLabsTool) setSidebarMode('ai-labs')
  }, [aiLabsTool])

  // Simpan classViewMode ke localStorage ketika berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-classViewMode-${id}`, classViewMode)
    }
  }, [classViewMode, id])

  // Simpan personalIndex ke localStorage ketika berubah
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`yearbook-personalIndex-${id}`, String(personalIndex))
    }
  }, [personalIndex, id])

  const currentClassId = album?.classes?.[classIndex]?.id
  const isOwner = album?.isOwner === true
  const isAlbumAdmin = album?.isAlbumAdmin === true

  // Optimized: Fetch all access data in one go (using my-access-all endpoint)
  // No longer need per-class fetch because the new endpoint is efficient
  const fetchAllAccess = useCallback(async () => {
    if (!id || isFetchingAccessRef.current) return
    const currentAlbum = albumRef.current
    const canManageAlbum = currentAlbum?.isOwner === true || currentAlbum?.isAlbumAdmin === true

    try {
      isFetchingAccessRef.current = true
      // 1. Fetch My Access & My Requests for ALL classes
      const myAccessRes = await fetch(`/api/albums/${id}/my-access-all`, { credentials: 'include', cache: 'no-store' })
      const myAccessData = await myAccessRes.json().catch(() => ({}))

      if (myAccessRes.ok) {
        setMyAccessByClass(prev => ({ ...prev, ...(myAccessData.access || {}) }))
        setMyRequestByClass(prev => ({ ...prev, ...(myAccessData.requests || {}) }))
      }

      // 2. If Admin, fetch ALL pending requests for approval
      if (canManageAlbum) {
        const requestsRes = await fetch(`/api/albums/${id}/join-requests?status=pending`, { credentials: 'include', cache: 'no-store' })
        const requestsData = await requestsRes.json().catch(() => [])

        if (requestsRes.ok && Array.isArray(requestsData)) {
          const byClass: Record<string, ClassRequest[]> = {}
          requestsData.forEach((req: any) => {
            const clsId = req.assigned_class_id
            if (clsId) {
              if (!byClass[clsId]) byClass[clsId] = []
              byClass[clsId].push(req)
            }
          })
          setRequestsByClass(prev => ({ ...prev, ...byClass }))
        }
      }

      setAccessDataLoaded(true)
    } catch (e) {
      console.error('Error fetching access data:', e)
    } finally {
      isFetchingAccessRef.current = false
    }
  }, [id])






  // Background: Fetch all access data immediately (now efficient)
  // Background: Fetch all access data immediately (now efficient)
  useEffect(() => {
    if ((view !== 'classes' && view !== 'cover') || !id) return
    if (!initialAccess?.access || Object.keys(initialAccess.access).length === 0) {
      fetchAllAccess()
    }
  }, [view, id, fetchAllAccess, initialAccess])

  // Realtime: tambah/edit/hapus group langsung muncul tanpa refresh
  useEffect(() => {
    if (!id || !album?.id) return
    const albumId = album.id

    const channel = supabase
      .channel(`yearbook-classes-${albumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_classes', filter: `album_id=eq.${albumId}` },
        () => {
          // Skip if we just made a local update in the last 3 seconds (optimistic update)
          const timeSinceLastUpdate = Date.now() - lastLocalUpdateRef.current
          if (timeSinceLastUpdate > 3000) {
            fetchAlbum()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_classes', filter: `album_id=eq.${albumId}` },
        () => {
          // Skip if we just made a local update in the last 3 seconds
          const timeSinceLastUpdate = Date.now() - lastLocalUpdateRef.current
          if (timeSinceLastUpdate > 3000) {
            fetchAlbum()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'album_classes', filter: `album_id=eq.${albumId}` },
        () => { fetchAlbum() }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, album?.id, fetchAlbum])

  // Optimized: Fetch ALL class members in one request
  const fetchAllClassMembers = useCallback(async () => {
    if (!id || isFetchingMembersRef.current) return
    try {
      isFetchingMembersRef.current = true
      const res = await fetch(`/api/albums/${id}/all-class-members`, { credentials: 'include', cache: 'no-store' })
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

  // Realtime: approval + access + profil card. Pakai ref agar global admin / device lain selalu refetch dengan data terbaru.
  useEffect(() => {
    if (!id || !album?.id || !album?.classes?.length) return
    const albumId = album.id

    const channel = supabase
      .channel(`yearbook-access-${albumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_class_access', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            refetchAccessAndMembersRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_class_access', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            refetchAccessAndMembersRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'album_class_access' },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            refetchAccessAndMembersRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_join_requests', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            fetchAllAccessRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_join_requests', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            fetchAllAccessRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'album_join_requests', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            fetchAllAccessRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'album_members', filter: `album_id=eq.${albumId}` },
        () => {
          if (accessUpdateTimeoutRef.current) clearTimeout(accessUpdateTimeoutRef.current)
          accessUpdateTimeoutRef.current = setTimeout(() => {
            fetchAllAccessRef.current()
            fetchAllClassMembersRef.current()
            setRealtimeCounter(c => c + 1)
          }, 1000)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, album?.id, album?.classes, fetchAllAccess, fetchMembersForAllClasses])

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
    const res = await fetch(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}`, { credentials: 'include', cache: 'no-store' })
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
      const res = await fetch(
        `/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`,
        { credentials: 'include', cache: 'no-store' }
      )
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
    const res = await fetch(`/api/albums/${id}/classes/${classId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.error ?? 'Gagal menghapus kelas')
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

  const handleUpdateAlbum = async (updates: { description?: string; cover_image_url?: string; students_count?: number; flipbook_bg_cover?: string; flipbook_bg_sambutan?: string; sambutan_font_family?: string; sambutan_title_color?: string; sambutan_text_color?: string; flipbook_mode?: string }) => {
    if (!id) return

    // Optimistic update
    setAlbum((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })

    // Background API call
    return fetch(`/api/albums/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(res => {
      if (!res.ok) {
        // Revert on error
        fetchAlbum()
        return null
      }
      return res.json()
    }).catch(() => {
      // Revert on error
      fetchAlbum()
      return null
    })
  }

  const handleUpdateClass = async (classId: string, updates: { name?: string; sort_order?: number; batch_photo_url?: string; flipbook_bg_url?: string; flipbook_font_family?: string; flipbook_title_color?: string; flipbook_text_color?: string }) => {
    if (!id) return null

    // Mark that we just did a local update
    lastLocalUpdateRef.current = Date.now()

    // Optimistic update - update UI immediately without waiting for server
    const optimisticUpdate = { id: classId, name: '', sort_order: 0, batch_photo_url: null as string | null, flipbook_bg_url: null as string | null }
    setAlbum((prev) => {
      if (!prev?.classes) return prev
      const currentClass = prev.classes.find(c => c.id === classId)
      if (!currentClass) return prev

      optimisticUpdate.name = updates.name !== undefined ? updates.name : currentClass.name
      optimisticUpdate.sort_order = updates.sort_order !== undefined ? updates.sort_order : (currentClass.sort_order ?? 0)
      // @ts-ignore
      optimisticUpdate.batch_photo_url = updates.batch_photo_url !== undefined ? updates.batch_photo_url : (currentClass.batch_photo_url ?? null)
      // @ts-ignore
      optimisticUpdate.flipbook_bg_url = updates.flipbook_bg_url !== undefined ? updates.flipbook_bg_url : (currentClass.flipbook_bg_url ?? null)

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
    return fetch(`/api/albums/${id}/classes/${classId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(res => {
      if (!res.ok) {
        // Revert on error
        fetchAlbum()
        return null
      }
      return optimisticUpdate
    }).catch(() => {
      // Revert on error
      fetchAlbum()
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
      const res = await fetch(`/api/albums/${id}/classes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Revert optimistic update on error
        toast.error(data?.error ?? 'Gagal menambah kelas')
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
    const res = await fetch(`/api/albums/${id}/classes/${classId}/request`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_name: requestForm.student_name.trim(), email: requestForm.email.trim() || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal mengajukan akses')
      return
    }
    // Response bisa dari album_class_access (approved) atau album_class_requests (pending request)
    if (data.status === 'approved') {
      setMyAccessByClass((prev) => ({ ...prev, [classId]: { id: data.id, student_name: data.student_name, email: data.email ?? null, status: 'approved', date_of_birth: data.date_of_birth ?? null, instagram: data.instagram ?? null, message: data.message ?? null, video_url: data.video_url ?? null } }))
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
              user_id: data.user_id ?? '',
              student_name: data.student_name ?? '',
              email: data.email ?? null,
              date_of_birth: data.date_of_birth ?? null,
              instagram: data.instagram ?? null,
              message: data.message ?? null,
              video_url: data.video_url ?? null,
              is_me: true
            } as ClassMember
          ]
        }
      })
      // Jangan refetch di sini: bisa menimpa optimistic update dan card hilang. Realtime akan sync.
      toast.success('Anda terdaftar di kelas ini.')
    } else {
      setMyRequestByClass((prev) => ({ ...prev, [classId]: { id: data.id, student_name: data.student_name, email: data.email ?? null, status: data.status ?? 'pending' } }))
      toast.success('Permintaan pendaftaran dikirim. Menunggu persetujuan.')
    }
    setRequestForm({ student_name: '', email: '' })
  }

  const handleApproveReject = async (classId: string, requestId: string, status: 'approved' | 'rejected') => {
    if (!id) return
    const res = await fetch(`/api/albums/${id}/classes/${classId}/requests/${requestId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal')
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

    const res = await fetch(`/api/albums/${id}/classes/${classId}/join-as-owner`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_name: '', // Bisa kosong, nanti diisi via edit
        email: ''
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal bergabung ke kelas')
      return
    }

    // Update state: tambahkan owner ke myAccessByClass dengan status approved
    setMyAccessByClass((prev) => ({
      ...prev,
      [classId]: {
        id: data.access.id,
        student_name: data.access.student_name ?? '',
        email: data.access.email ?? null,
        status: 'approved'
      },
    }))

    // Optimistic: tambah owner ke daftar member agar profil card langsung muncul
    const access = data.access as { user_id?: string; student_name?: string; email?: string | null }
    setMembersByClass((prev) => {
      const list = prev[classId] ?? []
      const alreadyIn = list.some((m) => m.is_me || m.user_id === access.user_id)
      if (alreadyIn) return prev
      return {
        ...prev,
        [classId]: [
          ...list,
          {
            user_id: access.user_id ?? '',
            student_name: access.student_name ?? '',
            email: access.email ?? null,
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
    setEditProfileName(data.access.student_name ?? '')
    setEditProfileEmail(data.access.email ?? '')
    setEditProfileTtl('')
    setEditProfileInstagram('')
    setEditProfilePesan('')
    setEditProfileVideoUrl('')

    // Jangan refetch di sini: API bisa belum mengembalikan row baru, sehingga list menimpa optimistic update dan card hilang. Realtime / navigasi akan sync nanti.
    toast.success('Berhasil! Silakan isi profil Anda.')
  }

  const handleSaveProfile = async (classId: string, deleteProfile: boolean = false, targetUserId?: string, overrideData?: any) => {
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
        const res = await fetch(url, { method: 'DELETE', credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? 'Gagal menghapus profil')
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
      const res = await fetch(url, {
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Gagal menyimpan')
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
      toast.success('Profil berhasil disimpan')
      if (album?.classes) await fetchMembersForAllClasses(album.classes)
      setEditingProfileClassId(null)
      setEditingMemberUserId(null)
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
      const res = await fetch(`/api/albums/${id}/members?user_id=${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Gagal mengubah role')
        return
      }
      toast.success(`Role berhasil diubah menjadi ${role === 'admin' ? 'Admin' : 'Member'}`)
      // Refresh album to get updated member list
      await fetchAlbum()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Gagal mengubah role')
    }
  }, [id, fetchAlbum])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!id) return
    try {
      const res = await fetch(`/api/albums/${id}/members?user_id=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Gagal menghapus member')
        return
      }
      toast.success('Member berhasil dihapus dari album')
      // Refresh album to get updated member list
      await fetchAlbum()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Gagal menghapus member')
    }
  }, [id, fetchAlbum])

  const handleUploadPhoto = async (classId: string, studentName: string, className: string, file: File) => {
    if (!id) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('class_id', classId)
    formData.append('student_name', studentName)
    const res = await fetch(`/api/albums/${id}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal upload foto')
      return
    }
    toast.success('Foto berhasil diupload')

    await fetchFirstPhotosForClass(classId)
    await fetchMembersForClass(classId)
    // Refresh preview: ambil daftar foto dari API agar langsung muncul (tanpa tunggu membersByClass)
    const resPhotos = await fetch(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`, { credentials: 'include', cache: 'no-store' })
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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('student_name', studentName)
    const res = await fetch(`/api/albums/${id}/classes/${classId}/video`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal upload video')
      return
    }
    toast.success('Video berhasil diupload')
    setLastUploadedVideoName(file.name)
    setTimeout(() => setLastUploadedVideoName(null), 5000)
    await fetchMembersForClass(classId)

  }

  const handleDeleteCover = async () => {
    if (!id || !album?.cover_image_url) return
    const res = await fetch(`/api/albums/${id}/cover`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.error ?? 'Gagal menghapus sampul')
      return
    }
    setAlbum((prev) => prev ? { ...prev, cover_image_url: null, cover_image_position: null } : null)
  }

  const handleUploadCoverVideo = async (file: File) => {
    if (!id) return
    setUploadingCoverVideo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/albums/${id}/cover-video`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error ?? 'Gagal upload video sampul')
        return
      }
      setAlbum((prev) => prev ? { ...prev, cover_video_url: data.cover_video_url ?? null } : null)
    } finally {
      setUploadingCoverVideo(false)
    }
  }

  const handleDeleteCoverVideo = async () => {
    if (!id || !album?.cover_video_url) return
    const res = await fetch(`/api/albums/${id}/cover-video`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.error ?? 'Gagal menghapus video sampul')
      return
    }
    setAlbum((prev) => prev ? { ...prev, cover_video_url: null } : null)
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
    const res = await fetch(
      `/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}&index=${index}`,
      { method: 'DELETE', credentials: 'include' }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Gagal menghapus foto')
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
    setUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('position_x', String(position.x))
      formData.append('position_y', String(position.y))
      const res = await fetch(`/api/albums/${id}/cover`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error ?? 'Gagal upload sampul')
        return
      }
      setAlbum((prev) =>
        prev
          ? {
            ...prev,
            cover_image_url: data.cover_image_url,
            cover_image_position: data.cover_image_position ?? prev.cover_image_position,
          }
          : null
      )
      if (dataUrlToRevoke) URL.revokeObjectURL(dataUrlToRevoke)
      setCoverPreview(null)
    } finally {
      setUploadingCover(false)
    }
  }

  const mobileFirstWrapper = 'w-full min-h-screen mx-auto bg-[#0a0a0b] lg:max-w-full'
  const contentWrapper = 'max-w-[420px] md:max-w-full w-full mx-auto'

  if (!id) {
    return (
      <div className={mobileFirstWrapper}>
        <div className={`${contentWrapper} p-4`}>
          <p className="text-red-400">ID album tidak valid.</p>
          <BackLink href={backHref} />
        </div>
      </div>
    )
  }

  if (loading) {
    const isCover = view === 'cover'
    const showClassesPanel = sidebarMode === 'classes' && !isCover
    const isAiLabs = sidebarMode === 'ai-labs'
    const isApproval = sidebarMode === 'approval'
    const isTeam = sidebarMode === 'team'

    return (
      <div className={mobileFirstWrapper}>
        {/* Navbar Skeleton */}
        <div className="sticky top-0 z-50 w-full h-14 border-b border-white/10 bg-[#0a0a0b] flex items-center px-4 gap-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse lg:hidden" />
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="ml-auto w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        </div>

        <div className="min-h-[calc(100vh-3.5rem)] relative">
          {/* Icon Sidebar Skeleton - Mimic Icon + Label */}
          <div className="hidden lg:flex fixed left-0 top-14 bottom-0 w-16 border-r border-white/10 flex-col items-center py-4 bg-[#0a0a0b] z-30">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1 mb-6">
                <div className="w-6 h-6 rounded-lg bg-white/5 animate-pulse" />
                <div className="w-8 h-2 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Panel Sidebar Skeleton (Classes List) - Only if Classes Mode */}
          {showClassesPanel && (
            <div className="hidden lg:flex fixed left-16 top-14 bottom-0 w-64 border-r border-white/10 flex-col p-4 bg-[#0a0a0b] z-20">
              <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse mb-6" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 w-full bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* Main Content Skeleton */}
          <div className={`p-4 ${showClassesPanel ? 'lg:ml-80' : 'lg:ml-16'} transition-all duration-300`}>
            <div className={`${contentWrapper} w-full`}>
              {isCover ? (
                /* 1. Cover Skeleton - Single Large Card */
                <div className="flex flex-col items-center max-w-xs mx-auto pt-4 sm:pt-8 animate-in fade-in duration-500">
                  <div className="w-full aspect-[3/4] bg-white/5 rounded-xl animate-pulse border border-white/10 mb-6 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="w-16 h-16 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className="w-3/4 h-6 bg-white/5 rounded-lg animate-pulse mb-3" />
                  <div className="w-1/2 h-4 bg-white/5 rounded animate-pulse" />
                </div>
              ) : isApproval ? (
                /* 2. Approval Skeleton - Tabs & List */
                <div className="flex flex-col gap-4 max-w-5xl mx-auto">
                  {/* Stats Header */}
                  <div className="flex gap-2 mb-2 px-1">
                    <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-2 mb-4 bg-white/[0.03] p-1 rounded-xl w-full sm:w-80">
                    <div className="flex-1 h-9 bg-white/10 rounded-lg animate-pulse" />
                    <div className="flex-1 h-9 bg-white/5 rounded-lg animate-pulse" />
                  </div>
                  {/* Request Items */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full h-20 bg-white/5 rounded-xl animate-pulse border border-white/5 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-white/10 rounded" />
                        <div className="h-3 w-1/4 bg-white/10 rounded" />
                      </div>
                      <div className="w-20 h-8 bg-white/5 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : isTeam ? (
                /* 3. Team Skeleton - Search & Compact List */
                <div className="max-w-5xl mx-auto">
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="w-full sm:w-64 h-9 bg-white/5 rounded-lg animate-pulse border border-white/10" />
                  </div>
                  {/* Compact Members */}
                  <div className="flex flex-col gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-16 w-full bg-white/5 rounded-lg border border-white/10 flex items-center p-3 gap-3 animate-pulse">
                        {/* No Avatar Circle */}
                        <div className="flex-1 space-y-2">
                          <div className="w-32 h-3 bg-white/10 rounded" />
                          <div className="w-24 h-2 bg-white/10 rounded" />
                        </div>
                        <div className="w-16 h-6 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* 4 & 5. Grid Layouts (AI Labs, Classes, Sambutan) */
                <div className="max-w-5xl mx-auto">
                  {/* Header with Add Button (Only for Sambutan) */}
                  {sidebarMode === 'sambutan' && (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Add Button on Left */}
                      <div className="w-32 h-10 bg-white/10 rounded-xl animate-pulse" />
                    </div>
                  )}

                  <div className={`grid grid-cols-2 sm:grid-cols-2 ${isAiLabs ? 'lg:grid-cols-5' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-3 sm:gap-4`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      isAiLabs ? (
                        /* AI Labs - Wide Grid */
                        <div key={i} className="bg-white/5 rounded-2xl animate-pulse border border-white/5 p-6 flex flex-col items-center justify-center gap-4 min-h-[160px]">
                          <div className="w-16 h-16 rounded-2xl bg-white/10" />
                          <div className="h-4 w-24 bg-white/10 rounded" />
                          <div className="h-3 w-32 bg-white/10 rounded" />
                        </div>
                      ) : (
                        /* Classes & Sambutan - Portrait Card Skeleton */
                        /* Mimics Teacher/Student Card: Photo (4/5) + Content Block */
                        <div key={i} className="bg-white/5 rounded-xl animate-pulse border border-white/5 overflow-hidden flex flex-col h-full">
                          {/* Photo Aspect 4/5 */}
                          <div className="w-full aspect-[4/5] bg-white/10" />
                          {/* Info Body */}
                          <div className="p-3 flex flex-col gap-2 flex-1">
                            <div className="h-4 w-3/4 bg-white/10 rounded" />
                            <div className="h-3 w-1/2 bg-white/10 rounded" />
                            {/* Action Row Mimic */}
                            <div className="mt-auto w-full h-7 bg-white/5 rounded-lg" />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className={mobileFirstWrapper}>
        <div className={`${contentWrapper} p-4 pb-6`}>
          <BackLink href={backHref} />
          <p className="text-red-400 mt-4">{error ?? 'Album tidak ditemukan.'}</p>
          <p className="text-muted text-sm mt-2">Pastikan album sudah disetujui (approved) dan Anda memiliki akses.</p>
        </div>
      </div>
    )
  }

  if (view === 'cover' || view === 'classes') {
    const isCoverView = view === 'cover'
    const showBackLink = true
    const currentClass = album?.classes?.[classIndex]
    const aiLabsToolLabel: Record<string, string> = { tryon: 'Virtual Try On', pose: 'Pose', 'image-editor': 'Image Editor', photogroup: 'Photo Group', phototovideo: 'Photo to Video' }
    const isAiLabsToolActive = sidebarMode === 'ai-labs' && !!aiLabsTool
    const aiLabsBackHref = album?.id ? `/user/portal/album/yearbook/${album.id}` : backHref
    const sectionTitle =
      isCoverView ? 'Sampul Album'
        : sidebarMode === 'ai-labs' ? (aiLabsTool ? (aiLabsToolLabel[aiLabsTool] ?? 'AI Labs') : 'AI Labs')
          : sidebarMode === 'sambutan' ? 'Sambutan'
            : sidebarMode === 'classes' ? (currentClass?.name ?? 'Kelas')
              : sidebarMode === 'approval' ? 'Persetujuan'
                : sidebarMode === 'team' ? 'Kelola Anggota'
                  : ''
    const sectionSubtitle =
      isCoverView ? 'Tampilan sampul dan pengaturan cover album.'
        : sidebarMode === 'ai-labs' ? (aiLabsTool ? '' : 'Pilih fitur yang ingin digunakan. Semua fitur AI tersedia di sini.')
          : sidebarMode === 'sambutan' ? 'Kartu sambutan dan profil.'
            : sidebarMode === 'classes' ? (currentClass ? 'Profil dan foto anggota kelas.' : 'Daftar kelas dan anggota.')
              : sidebarMode === 'approval' ? 'Kelola permintaan akses dan persetujuan.'
                : sidebarMode === 'team' ? 'Kelola anggota tim album.'
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
          <div className="flex sticky top-0 z-50 bg-[#0a0a0b] border-b border-white/10 px-3 lg:px-4 h-14 items-center gap-3 lg:gap-4">
            {/* Mobile: compact back arrow */}
            <Link href={isAiLabsToolActive ? aiLabsBackHref : backHref} className="lg:hidden inline-flex items-center justify-center p-1.5 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            {/* Desktop: full BackLink */}
            <div className="hidden lg:block">
              <BackLink href={backHref} label={backLabel} />
            </div>
            {sectionTitle && (
              <>
                {/* Mobile: title centered */}
                <div className="lg:hidden absolute left-0 right-0 flex justify-center pointer-events-none">
                  <h1 className="text-base font-bold text-app truncate max-w-[60%] text-center">{sectionTitle}</h1>
                </div>
                {/* Desktop: title centered */}
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-center min-w-0 max-w-[50%]">
                  <div className="flex items-center justify-center gap-2">
                    <h1 className="text-lg font-bold text-app truncate">{sectionTitle}</h1>
                    {headerCount !== null && headerCount !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium text-gray-300 border border-white/5">
                        {headerCount}
                      </span>
                    )}
                  </div>
                  {sectionSubtitle && <p className="text-xs text-muted mt-0.5 truncate">{sectionSubtitle}</p>}
                </div>
              </>
            )}
            {/* Mobile: people count badge on the right */}
            {headerCount !== null && headerCount !== undefined && (
              <div className="lg:hidden ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-300">{headerCount}</span>
              </div>
            )}
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
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
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
            // Cover View Props
            isCoverView={view === 'cover'}
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
            onTeacherCountChange={setTeacherCount}
            onTeamMemberCountChange={setTeamMemberCount}
          />
        </div>
        {videoPopupUrl && id && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => { setVideoPopupUrl(null); setVideoPopupError(null) }}>
            <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <video
                src={`/api/albums/${id}/video-play?url=${encodeURIComponent(videoPopupUrl)}`}
                autoPlay
                playsInline
                className="w-full rounded-xl bg-black"
                onError={() => setVideoPopupError('Video tidak dapat dimuat')}
                onEnded={() => { setVideoPopupUrl(null); setVideoPopupError(null) }}
              />
              {videoPopupError && (
                <>
                  <p className="mt-2 text-sm text-red-400 text-center">{videoPopupError}</p>
                  <button type="button" onClick={() => { setVideoPopupUrl(null); setVideoPopupError(null) }} className="mt-3 px-4 py-2 rounded-xl bg-white/10 text-app font-medium hover:bg-white/20">Tutup</button>
                </>
              )}
            </div>
          </div>
        )}
        {coverPreview && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
            <p className="text-app font-medium mb-3">Geser gambar agar posisi pas, lalu Terapkan</p>
            <div
              ref={coverPreviewContainerRef}
              className="w-full max-w-md aspect-[3/4] rounded-xl overflow-hidden bg-white/10 relative touch-none select-none"
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
                alt="Preview sampul"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(coverPreview.dataUrl)
                  setCoverPreview(null)
                }}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-app font-medium hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => handleUploadCover(coverPreview.file, coverPosition, coverPreview.dataUrl)}
                className="px-5 py-2.5 rounded-xl bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
              >
                {uploadingCover ? 'Mengunggah…' : 'Terapkan'}
              </button>
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
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 bg-black/80 flex-wrap">
          <button
            type="button"
            onClick={() => { setView('classes'); setGalleryStudent(null); setPhotos([]) }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-app hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" /> Kembali
          </button>
          <span className="text-app font-medium truncate max-w-[40%]">{galleryStudent.studentName} — {galleryStudent.className}</span>
          <span className="text-muted text-sm">{hasPhotos ? `${photoIndex + 1}/${photos.length}` : '0'}</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime-600 text-white text-sm font-medium hover:bg-lime-500"
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
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-lime-600 text-white text-sm font-medium hover:bg-lime-500"
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
