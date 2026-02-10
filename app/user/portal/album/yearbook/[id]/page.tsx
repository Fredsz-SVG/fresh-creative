'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import BackLink from '@/components/dashboard/BackLink'
import { ChevronLeft, ChevronRight, BookOpen, ImagePlus, Video, Play } from 'lucide-react'
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
  isOwner?: boolean
  isAlbumAdmin?: boolean
  isGlobalAdmin?: boolean
  classes: { id: string; name: string; sort_order: number; student_count: number }[]
}

type ClassAccess = { id: string; student_name: string; email?: string | null; status: string; date_of_birth?: string | null; instagram?: string | null; message?: string | null; video_url?: string | null }
type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }
type ClassMember = { user_id: string; student_name: string; email: string | null; date_of_birth: string | null; instagram: string | null; message: string | null; video_url: string | null; photos?: string[]; is_me?: boolean; status?: string }
type StudentInClass = { student_name: string; photo_count: number }
type Photo = { id: string; file_url: string; student_name: string; created_at?: string }

type YearbookAlbumPageProps = {
  backHref?: string
  backLabel?: string
}

export default function YearbookAlbumPage({ backHref = '/user/portal/albums', backLabel = 'Ke Album Saya' }: YearbookAlbumPageProps = {}) {
  const params = useParams()
  const id = params?.id as string | undefined
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentInClass[]>>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [galleryStudent, setGalleryStudent] = useState<{ classId: string; studentName: string; className: string } | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [addingClass, setAddingClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [myAccessByClass, setMyAccessByClass] = useState<Record<string, ClassAccess | null>>({})
  const [myRequestByClass, setMyRequestByClass] = useState<Record<string, ClassRequest | null>>({})
  const [accessDataLoaded, setAccessDataLoaded] = useState(false)
  const [requestsByClass, setRequestsByClass] = useState<Record<string, ClassRequest[]>>({})
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [sidebarMode, setSidebarMode] = useState<'classes' | 'approval' | 'team' | 'sambutan'>(() => {
    if (typeof window !== 'undefined' && id) {
      const saved = localStorage.getItem(`yearbook-sidebarMode-${id}`)
      return (saved as 'classes' | 'approval' | 'team' | 'sambutan') || 'classes'
    }
    return 'classes'
  })
  const [requestForm, setRequestForm] = useState<{ student_name: string; email: string }>({ student_name: '', email: '' })
  const [membersByClass, setMembersByClass] = useState<Record<string, ClassMember[]>>({})
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      const res = await fetch(`/api/albums/${id}`, { credentials: 'include' })
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
    fetchAlbum()
  }, [fetchAlbum])

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

  // Optimized: Fetch access untuk single class (lebih cepat)
  const fetchAccessForClass = useCallback(async (classId: string) => {
    if (!id) return
    const canManageAlbum = album?.isOwner === true || album?.isAlbumAdmin === true
    
    const [accessRes, requestRes, requestsRes] = await Promise.all([
      fetch(`/api/albums/${id}/classes/${classId}/my-access`, { credentials: 'include' }),
      fetch(`/api/albums/${id}/classes/${classId}/my-request`, { credentials: 'include' }),
      canManageAlbum ? fetch(`/api/albums/${id}/classes/${classId}/requests?status=pending`, { credentials: 'include' }) : null,
    ])
    
    const accessData = await accessRes.json().catch(() => null)
    const requestPayload = await requestRes.json().catch(() => null)
    const requestData = requestRes.ok ? (requestPayload?.request ?? requestPayload) : null
    
    setMyAccessByClass((prev) => ({ 
      ...prev, 
      [classId]: accessData?.id != null ? accessData : null 
    }))
    setMyRequestByClass((prev) => ({ 
      ...prev, 
      [classId]: requestData && typeof requestData === 'object' && requestData.id != null ? requestData : null 
    }))
    
    if (canManageAlbum && requestsRes) {
      const requestsData = await requestsRes.json().catch(() => [])
      setRequestsByClass((prev) => ({ 
        ...prev, 
        [classId]: Array.isArray(requestsData) ? requestsData : [] 
      }))
    }
    
    setAccessDataLoaded(true)
  }, [id, album?.isOwner, album?.isAlbumAdmin])

  const fetchAllAccess = useCallback(async () => {
    if (!album?.classes?.length || !id) return
    const accessOut: Record<string, ClassAccess | null> = {}
    const requestOut: Record<string, ClassRequest | null> = {}
    const requestsOut: Record<string, ClassRequest[]> = {}
    const canManageAlbum = album.isOwner === true || album.isAlbumAdmin === true
    await Promise.all(
      album.classes.map(async (c) => {
        const [accessRes, requestRes, requestsRes] = await Promise.all([
          fetch(`/api/albums/${id}/classes/${c.id}/my-access`, { credentials: 'include' }),
          fetch(`/api/albums/${id}/classes/${c.id}/my-request`, { credentials: 'include' }),
          canManageAlbum ? fetch(`/api/albums/${id}/classes/${c.id}/requests?status=pending`, { credentials: 'include' }) : null,
        ])
        const accessData = await accessRes.json().catch(() => null)
        accessOut[c.id] = accessData?.id != null ? accessData : null
        const requestPayload = await requestRes.json().catch(() => null)
        const requestData = requestRes.ok ? (requestPayload?.request ?? requestPayload) : null
        requestOut[c.id] = requestData && typeof requestData === 'object' && requestData.id != null ? requestData : null
        if (canManageAlbum && requestsRes) {
          const requestsData = await requestsRes.json().catch(() => [])
          requestsOut[c.id] = Array.isArray(requestsData) ? requestsData : []
        }
      })
    )
    setMyAccessByClass((prev) => ({ ...prev, ...accessOut }))
    setMyRequestByClass((prev) => ({ ...prev, ...requestOut }))
    setRequestsByClass((prev) => ({ ...prev, ...requestsOut }))
    setAccessDataLoaded(true)
  }, [album?.classes, album?.isOwner, album?.isAlbumAdmin, id])

  // Optimized: Fetch hanya current class saat pertama kali atau pindah class
  useEffect(() => {
    if ((view !== 'classes' && view !== 'cover') || !currentClassId || !id) return
    
    // Cek apakah data class ini sudah ada
    const hasData = myAccessByClass[currentClassId] !== undefined || myRequestByClass[currentClassId] !== undefined
    
    if (!hasData) {
      // Fetch hanya class ini (fast!)
      fetchAccessForClass(currentClassId)
    }
  }, [view, currentClassId, id, myAccessByClass, myRequestByClass, fetchAccessForClass])

  // Background: Fetch all classes (lazy load) - tidak block UI
  useEffect(() => {
    if ((view !== 'classes' && view !== 'cover') || !album?.classes?.length || !id) return
    
    // Delay agar tidak block initial render
    const timer = setTimeout(() => {
      fetchAllAccess()
    }, 1000) // Fetch all setelah 1 detik
    
    return () => clearTimeout(timer)
  }, [view, album?.classes?.length, id, fetchAllAccess])

  // Realtime: tambah/edit/hapus group langsung muncul tanpa refresh
  useEffect(() => {
    if (!id || !album?.id) return
    const albumId = album.id
    const channel = supabase
      .channel(`yearbook-classes-${albumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_classes', filter: `album_id=eq.${albumId}` },
        () => { fetchAlbum() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_classes', filter: `album_id=eq.${albumId}` },
        () => { fetchAlbum() }
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

  const fetchMembersForClass = useCallback(async (classId: string) => {
    if (!id) return
    const res = await fetch(`/api/albums/${id}/classes/${classId}/members`, { credentials: 'include' })
    const data = await res.json().catch(() => [])
    if (Array.isArray(data)) setMembersByClass((prev) => ({ ...prev, [classId]: data }))
  }, [id])

  const fetchMembersForAllClasses = useCallback(async (classes: { id: string }[]) => {
    if (!id) return
    const results = await Promise.all(
      classes.map(async (c) => {
        const res = await fetch(`/api/albums/${id}/classes/${c.id}/members`, { credentials: 'include' })
        const data = await res.json().catch(() => [])
        return { classId: c.id, members: Array.isArray(data) ? data : [] }
      })
    )
    const membersMap: Record<string, ClassMember[]> = {}
    results.forEach(r => {
      membersMap[r.classId] = r.members
    })
    setMembersByClass(membersMap)
  }, [id])

  const refetchAccessAndMembersRef = useRef<() => void>(() => { })
  const fetchAllAccessRef = useRef(fetchAllAccess)
  fetchAllAccessRef.current = fetchAllAccess
  useEffect(() => {
    if (!album?.classes?.length || !id) return
    refetchAccessAndMembersRef.current = () => {
      fetchAllAccessRef.current()
      fetchMembersForAllClasses(album.classes)
    }
  }, [album?.classes, album?.id, id, fetchAllAccess, fetchMembersForAllClasses])

  // Realtime: approval + access + profil card. Pakai ref agar global admin / device lain selalu refetch dengan data terbaru.
  useEffect(() => {
    if (!id || !album?.id || !album?.classes?.length) return
    const albumId = album.id

    const channel = supabase
      .channel(`yearbook-access-${albumId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_class_access', filter: `album_id=eq.${albumId}` },
        () => { refetchAccessAndMembersRef.current() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_class_access', filter: `album_id=eq.${albumId}` },
        () => { refetchAccessAndMembersRef.current() }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'album_class_access' },
        () => { refetchAccessAndMembersRef.current() }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'album_class_requests' },
        () => { fetchAllAccessRef.current() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'album_class_requests' },
        () => { fetchAllAccessRef.current() }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'album_class_requests' },
        () => { fetchAllAccessRef.current() }
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
    const res = await fetch(`/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}`, { credentials: 'include' })
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

  const fetchStudentsForClasses = useCallback(async (classes: { id: string }[], isOwnerFlag: boolean): Promise<Record<string, ClassAccess | null>> => {
    const out: Record<string, StudentInClass[]> = {}
    const accessOut: Record<string, ClassAccess | null> = {}
    const requestsOut: Record<string, ClassRequest[]> = {}
    await Promise.all(
      classes.map(async (c) => {
        const [studentsRes, accessRes, requestsRes] = await Promise.all([
          fetch(`/api/albums/${id}/classes/${c.id}/students`, { credentials: 'include' }),
          fetch(`/api/albums/${id}/classes/${c.id}/my-access`, { credentials: 'include' }),
          (isOwnerFlag || album?.isAlbumAdmin) ? fetch(`/api/albums/${id}/classes/${c.id}/requests?status=pending`, { credentials: 'include' }) : null,
        ])
        const studentsData = await studentsRes.json().catch(() => [])
        out[c.id] = Array.isArray(studentsData) ? studentsData : []
        const accessData = await accessRes.json().catch(() => null)
        accessOut[c.id] = accessData?.id != null ? accessData : null
        if (requestsRes) {
          const requestsData = await requestsRes.json().catch(() => [])
          requestsOut[c.id] = Array.isArray(requestsData) ? requestsData : []
        }
      })
    )
    setStudentsByClass(out)
    setMyAccessByClass((prev) => ({ ...prev, ...accessOut }))
    setRequestsByClass((prev) => ({ ...prev, ...requestsOut }))
    return accessOut
  }, [id])

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
      await fetchStudentsForClasses(album.classes, album.isOwner === true || album.isAlbumAdmin === true)
      // Fetch member details untuk kelas pertama
      const firstClassId = album.classes[0]?.id
      if (firstClassId) {
        await fetchMembersForClass(firstClassId)
      }
    }
  }, [album?.classes, album?.isOwner, fetchStudentsForClasses, fetchMembersForClass])

  const openGallery = useCallback(async (classId: string, studentName: string, className: string) => {
    setGalleryStudent({ classId, studentName, className })
    setView('gallery')
    setPhotoIndex(0)
    try {
      const res = await fetch(
        `/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`,
        { credentials: 'include' }
      )
      const data = await res.json().catch(() => [])
      setPhotos(Array.isArray(data) ? data : [])
    } catch {
      setPhotos([])
    }
  }, [id])

  const goPrevClass = () => setClassIndex((i) => Math.max(0, i - 1))
  const goNextClass = () => setClassIndex((i) => Math.min((album?.classes?.length ?? 1) - 1, i + 1))

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!id) return
    if (!confirm(`Hapus kelas "${className}"? Semua foto di kelas ini akan ikut terhapus.`)) return
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
    setStudentsByClass((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
    setClassIndex((i) => {
      const len = (album?.classes?.length ?? 1) - 1
      if (len <= 0) return 0
      return Math.min(i, len - 1)
    })
  }

  const handleUpdateClass = async (classId: string, updates: { name?: string; sort_order?: number }) => {
    if (!id) return
    const res = await fetch(`/api/albums/${id}/classes/${classId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.error ?? 'Gagal memperbarui kelas')
      return null
    }
    const updated = data as { id: string; name: string; sort_order?: number }

    // Update album state dengan kelas yang disort ulang
    setAlbum((prev) => {
      if (!prev?.classes) return prev
      const newClasses = prev.classes
        .map((c) => (c.id === classId ? { ...c, name: updated.name, sort_order: updated.sort_order ?? c.sort_order } : c))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      return { ...prev, classes: newClasses }
    })

    // Jika ada perubahan sort_order, update classIndex ke posisi baru
    if (updates.sort_order !== undefined) {
      setAlbum((prev) => {
        if (!prev?.classes) return prev
        const newIndex = prev.classes.findIndex((c) => c.id === classId)
        if (newIndex !== -1 && newIndex !== classIndex) {
          setClassIndex(newIndex)
        }
        return prev
      })
    }

    return updated
  }

  const handleAddClass = async () => {
    if (!id || !newClassName.trim()) return
    const res = await fetch(`/api/albums/${id}/classes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.error ?? 'Gagal menambah kelas')
      return
    }
    const created = data as { id: string; name: string; sort_order?: number }
    setNewClassName('')
    setAddingClass(false)
    setAlbum((prev) =>
      prev
        ? {
          ...prev,
          classes: [...(prev.classes ?? []), { id: created.id, name: created.name, sort_order: created.sort_order ?? prev.classes?.length ?? 0, student_count: 0 }],
        }
        : prev
    )
    setStudentsByClass((prev) => ({ ...prev, [created.id]: [] }))
    setRequestsByClass((prev) => ({ ...prev, [created.id]: [] }))

    // For owner: auto-register to the newly created class and open edit form
    if (isOwner) {
      // Auto-add owner to myAccessByClass with empty name - ready for editing
      setMyAccessByClass((prev) => ({
        ...prev,
        [created.id]: { id: created.id, student_name: '', email: null, status: 'approved' },
      }))
      // Open edit form for owner to input their name
      setEditingProfileClassId(created.id)
      setEditProfileName('')
      setEditProfileEmail('')
      setEditProfileTtl('')
      setEditProfileInstagram('')
      setEditProfilePesan('')
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
      alert(data?.error ?? 'Gagal mengajukan akses')
      return
    }
    // Response bisa dari album_class_access (approved) atau album_class_requests (pending request)
    if (data.status === 'approved') {
      setMyAccessByClass((prev) => ({ ...prev, [classId]: { id: data.id, student_name: data.student_name, email: data.email ?? null, status: 'approved', date_of_birth: data.date_of_birth ?? null, instagram: data.instagram ?? null, message: data.message ?? null, video_url: data.video_url ?? null } }))
      setMyRequestByClass((prev) => ({ ...prev, [classId]: null }))
    } else {
      setMyRequestByClass((prev) => ({ ...prev, [classId]: { id: data.id, student_name: data.student_name, email: data.email ?? null, status: data.status ?? 'pending' } }))
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
      alert(data?.error ?? 'Gagal')
      return
    }
    // Remove request dari pending list
    setRequestsByClass((prev) => ({
      ...prev,
      [classId]: (prev[classId] ?? []).filter((r) => r.id !== requestId),
    }))
    // Jika approved, refresh members list untuk kelas ini
    if (status === 'approved') {
      fetchStudentsForClasses(album?.classes ?? [], isOwner || isAlbumAdmin)
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
      alert(data?.error ?? 'Gagal bergabung ke kelas')
      return
    }
    
    // Update state: tambahkan owner ke myAccessByClass dengan status approved
    setMyAccessByClass((prev) => ({
      ...prev,
      [classId]: { 
        id: data.access.id, 
        student_name: '', 
        email: null, 
        status: 'approved' 
      },
    }))
    
    // Auto-open edit form supaya owner bisa isi nama
    setEditingProfileClassId(classId)
    setEditProfileName('')
    setEditProfileEmail('')
    setEditProfileTtl('')
    setEditProfileInstagram('')
    setEditProfilePesan('')
    setEditProfileVideoUrl('')
    
    // Refetch members untuk update card list
    fetchMembersForClass(classId)
    
    alert('Berhasil! Silakan isi profil Anda')
  }

  const handleSaveProfile = async (classId: string, deleteProfile: boolean = false, targetUserId?: string) => {
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

    console.log('[handleSaveProfile] URL:', url, 'deleteProfile:', deleteProfile)

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

    if (!editProfileName.trim()) {
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
          student_name: editProfileName.trim(),
          email: editProfileEmail.trim() || null,
          date_of_birth: editProfileTtl.trim() || null,
          instagram: editProfileInstagram.trim() || null,
          message: editProfilePesan.trim() || null,
          video_url: editProfileVideoUrl.trim() || null,
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
    if (!confirm('Yakin ingin menghapus member ini dari album?')) return
    
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
    await fetchStudentsForClasses(album?.classes ?? [], isOwner || isAlbumAdmin)
    await fetchFirstPhotosForClass(classId)
    await fetchMembersForClass(classId)
    const members = membersByClass[currentClassId ?? ''] ?? []
    const viewingThisStudent = members[personalIndex]?.student_name === studentName
    if (viewingThisStudent) fetchStudentPhotosForCard(classId, studentName)
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
    await fetchStudentsForClasses(album?.classes ?? [], isOwner || isAlbumAdmin)
  }

  const handleDeleteCover = async () => {
    if (!id || !album?.cover_image_url) return
    if (!confirm('Hapus sampul album?')) return
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
    if (!confirm('Hapus video sampul?')) return
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
    await fetchStudentsForClasses(album?.classes ?? [], isOwner || isAlbumAdmin)
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
    return (
      <div className={mobileFirstWrapper}>
        <div className={`${contentWrapper} min-h-[60vh] flex items-center justify-center p-4`}>
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-lime-500 border-t-transparent" />
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
    
    return (
      <div className={mobileFirstWrapper}>
        {/* Sticky Header - Only show for cover or classes mode */}
        {showBackLink && (
          <div className="hidden lg:block sticky top-0 z-50 bg-[#0a0a0b] border-b border-white/10 px-4 py-2">
            <BackLink href={backHref} label={backLabel} />
          </div>
        )}

        {/* Main Content */}
        <div className={`${contentWrapper} h-full flex flex-col`}>
          <YearbookClassesView
            album={album}
            classIndex={classIndex}
            setClassIndex={setClassIndex}
            studentsByClass={studentsByClass}
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
            requestsByClass={requestsByClass}
            myAccessByClass={myAccessByClass}
            myRequestByClass={myRequestByClass}
            accessDataLoaded={accessDataLoaded}
            selectedRequestId={selectedRequestId}
            setSelectedRequestId={setSelectedRequestId}
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
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
