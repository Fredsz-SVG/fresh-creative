'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, X, Edit3, ImagePlus, Video, Play, Minus, Instagram, Users, ClipboardList, Menu, Cake, Shield, Copy, Link, Clock, BookOpen, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import TeacherCard from '@/components/TeacherCard'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number }
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
    return <div className="text-sm text-gray-500">Loading...</div>
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

    // Auto-save name after 1 second of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (newName.trim() && newName.trim() !== classObj.name) {
        saveChanges(newName, order)
      }
    }, 1000)
  }

  const handleOrderChange = (newOrder: number) => {
    setOrder(newOrder)
    // Real-time save on order change - immediately, no timeout
    saveChanges(name, newOrder)
  }

  const handleSaveName = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveChanges(name, order)
    setEditing(false)
  }

  const handleCancel = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setEditing(false)
    setName(classObj.name)
    setOrder(classObj.sort_order ?? 0)
  }

  return (
    <div className={`flex items-center gap-1.5 w-full ${p.center ? 'justify-center' : ''}`}>
      {!editing ? (
        <>
          <h2 className={`text-sm lg:text-base font-semibold text-app flex-1 break-words truncate ${p.center ? 'text-center' : 'text-left'}`}>{classObj.name}</h2>
          {isOwner && (
            <>
              <button onClick={() => setEditing(true)} className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-md hover:bg-white/5 flex-shrink-0" title="Edit group">
                <Edit3 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Yakin ingin menghapus group ini? Semua data member di dalamnya akan hilang.')) {
                    onDelete && onDelete(classObj.id)
                  }
                }}
                className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-md hover:bg-red-500/10 text-red-400 flex-shrink-0"
                title="Hapus group"
              >
                <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center gap-1 w-full flex-wrap justify-center">
          <input
            ref={nameRef}
            value={name}
            onChange={handleNameChange}
            className="flex-1 min-w-[120px] px-2 py-1.5 rounded text-xs lg:text-sm bg-white/5 border border-white/10 text-app text-center"
          />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleOrderChange(Math.max(0, (order ?? 0) - 1))}
              className="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-md hover:bg-white/5 disabled:opacity-50 flex-shrink-0"
              disabled={order === 0}
              title="Pindah ke atas"
            >
              <Minus className="w-3 h-3" />
            </button>
            <div className="text-xs w-6 lg:w-8 text-center flex-shrink-0">{Math.min((order ?? 0) + 1, classesCount || 1)}/{classesCount || 1}</div>
            <button
              onClick={() => handleOrderChange(Math.min((classesCount || 1) - 1, (order ?? 0) + 1))}
              className="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-md hover:bg-white/5 disabled:opacity-50 flex-shrink-0"
              disabled={order >= (classesCount || 1) - 1}
              title="Pindah ke bawah"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={handleSaveName}
            className="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-md bg-lime-600 text-white hover:bg-lime-500 flex-shrink-0"
            title="Simpan"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-md border border-white/10 hover:bg-white/5 flex-shrink-0"
            title="Batal"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function YearbookClassesViewUI(props: any) {
  // YearbookClassesView component - displays member grid with photos and profiles
  const {
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
    sidebarMode = 'classes' as 'classes' | 'approval' | 'team' | 'sambutan',
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
  } = props

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addingByEmail, setAddingByEmail] = useState(false)
  const [memberInviteLink, setMemberInviteLink] = useState<string | null>(null)
  const [creatingMemberInvite, setCreatingMemberInvite] = useState(false)
  const [members, setMembers] = useState<{ user_id: string; email: string; name?: string; role: string }[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [teacherPhotoViewer, setTeacherPhotoViewer] = useState<{ teacher: Teacher; photoIndex: number } | null>(null)
  const [teacherVideoViewer, setTeacherVideoViewer] = useState<{ teacher: Teacher; videoUrl: string } | null>(null)
  
  // Join requests state
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [joinStats, setJoinStats] = useState<any>(null)
  const [editingLimit, setEditingLimit] = useState(false)
  const [editLimitValue, setEditLimitValue] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [approvalTab, setApprovalTab] = useState<'pending' | 'approved'>('pending')
  const [assigningRequest, setAssigningRequest] = useState<string | null>(null)
  const [selectedClassForAssign, setSelectedClassForAssign] = useState<string>('')

  const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

  const fetchMembers = async () => {
    if (!album?.id) return
    const res = await fetch(`/api/albums/${album.id}/members`, { credentials: 'include' })
    const data = await res.json().catch(() => [])
    if (res.ok && Array.isArray(data)) {
      setMembers(data)
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
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  useEffect(() => {
    if (sidebarMode === 'sambutan' && canManage) {
      fetchTeachers()
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
        // Refresh members untuk kelas yang baru di-assign
        if (fetchMembersForClass) {
          await fetchMembersForClass(assigned_class_id)
        }
        setAssigningRequest(null)
        setSelectedClassForAssign('')
      } else {
        toast.error(data.error || 'Gagal menyetujui request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Terjadi kesalahan')
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
        toast.success('Guru berhasil ditambahkan')
      } else {
        toast.error(data.error || 'Gagal menambahkan guru')
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
        setTeachers(prev => prev.map(t => t.id === teacherId ? data : t))
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
    if (!confirm(`Hapus ${teacherName} dari daftar?`)) return
    try {
      const res = await fetch(`/api/albums/${album.id}/teachers/${teacherId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTeachers(prev => prev.filter(t => t.id !== teacherId))
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

  const handleUploadTeacherVideo = async (teacherId: string, file: File) => {
    if (!album?.id) return
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

  const generateMemberInvite = async () => {
    if (!album?.id) return
    setCreatingMemberInvite(true)
    try {
      const res = await fetch(`/api/albums/${album.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' })
      })
      const data = await res.json()
      if (res.ok && data.token) {
        const url = `${window.location.origin}/invite/${data.token}`
        setMemberInviteLink(url)
        toast.success('Link undangan member berhasil dibuat')
      } else {
        toast.error(data.error || 'Gagal membuat link')
      }
    } catch (e) {
      toast.error('Gagal membuat link undangan')
    } finally {
      setCreatingMemberInvite(false)
    }
  }

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addEmail.trim() || !album?.id) return
    setAddingByEmail(true)
    try {
      const res = await fetch(`/api/albums/${album.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim(), role: 'admin' })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Berhasil menambahkan ${addEmail} sebagai helper`)
        setAddEmail('')
        fetchMembers()
      } else {
        toast.error(data.error || 'Gagal menambahkan helper')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setAddingByEmail(false)
    }
  }

  // Teacher Photo Viewer Modal
  if (teacherPhotoViewer) {
    const { teacher, photoIndex } = teacherPhotoViewer
    const photos = teacher.photos || []
    const currentPhoto = photos[photoIndex]
    
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 bg-black/80">
          <button
            type="button"
            onClick={() => setTeacherPhotoViewer(null)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" /> Tutup
          </button>
          <span className="text-white font-medium">{teacher.name}</span>
          <span className="text-gray-400 text-sm">{photoIndex + 1}/{photos.length}</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: Math.max(0, photoIndex - 1) })}
              disabled={photoIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          <img 
            src={currentPhoto?.file_url} 
            alt={`${teacher.name}`}
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={() => setTeacherPhotoViewer(null)}
          />
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => setTeacherPhotoViewer({ teacher, photoIndex: Math.min(photos.length - 1, photoIndex + 1) })}
              disabled={photoIndex >= photos.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-40 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Teacher Video Viewer Modal
  if (teacherVideoViewer) {
    const { teacher, videoUrl } = teacherVideoViewer
    
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10 bg-black/80">
          <button
            type="button"
            onClick={() => setTeacherVideoViewer(null)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" /> Tutup
          </button>
          <span className="text-white font-medium">{teacher.name}</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black p-4">
          <video 
            src={videoUrl} 
            className="max-w-full max-h-full cursor-pointer"
            autoPlay
            loop
            muted
            playsInline
            onClick={() => setTeacherVideoViewer(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col w-full lg:max-w-full">
      {/* Mobile Bottom Navigation - App Style */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0a0a0b] border-t border-white/10 flex lg:hidden items-center justify-around h-16 pb-safe safe-area-bottom shadow-2xl">
        {canManage && (
          <button
            onClick={() => {
              setSidebarMode('sambutan')
              setView('classes')
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${sidebarMode === 'sambutan' ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Sambutan</span>
          </button>
        )}
        <button
          onClick={() => {
            if (sidebarMode === 'classes') {
              setMobileMenuOpen(true)
            } else {
              setSidebarMode('classes')
              setView('classes')
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${sidebarMode === 'classes' ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Group</span>
        </button>
        {canManage && (
          <button
            onClick={() => {
              setSidebarMode('approval')
              setView('classes')
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform relative ${sidebarMode === 'approval' ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
          >
            <div className="relative">
              <ClipboardList className="w-5 h-5" />
              {(joinStats && joinStats.pending_count > 0) && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Approval</span>
          </button>
        )}
        {canManage && (
          <button
            onClick={() => {
              setSidebarMode('team')
              setView('classes')
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 active:scale-95 transition-transform ${sidebarMode === 'team' ? 'text-lime-400' : 'text-gray-500 hover:text-white'}`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium">Team</span>
          </button>
        )}
      </div>
      {/* Main Content - Header already sticky in parent (page.tsx) */}
      <div className="flex-1 flex flex-col p-4 pb-8">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0]
          const target = uploadPhotoTargetRef.current
          if (target && file && typeof onUploadPhoto === 'function') onUploadPhoto(target.classId, target.studentName, target.className, file)
          uploadPhotoTargetRef.current = null
          e.target.value = ''
        }} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0]
          const target = uploadVideoTargetRef.current
          if (target && file && typeof onUploadVideo === 'function') onUploadVideo(target.classId, target.studentName, target.className, file)
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
          <div className="hidden lg:fixed lg:left-0 lg:top-12 lg:w-16 lg:h-[calc(100vh-48px)] lg:flex flex-col lg:z-40 lg:bg-black/40 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
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

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setSidebarMode('sambutan')
                  setView('classes')
                }}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors ${sidebarMode === 'sambutan'
                  ? 'bg-lime-600/20 text-lime-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                title="Sambutan Guru"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="text-[10px]">Sambutan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSidebarMode('classes')
                setView('classes')
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
                    setSidebarMode('approval')
                    setView('classes')
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-b border-white/10 text-xs font-medium transition-colors relative ${sidebarMode === 'approval'
                    ? 'bg-lime-600/20 text-lime-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  title="Approval"
                >
                  <ClipboardList className="w-6 h-6" />
                  <span className="text-[10px]">Approval</span>
                  {joinStats && joinStats.pending_count > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarMode('team')
                    setView('classes')
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

          {/* Panel Group List - Fixed di tengah (hanya tampil saat mode classes) */}
          {sidebarMode === 'classes' && !isCoverView && (
            <div className="hidden lg:fixed lg:left-16 lg:top-12 lg:w-64 lg:h-[calc(100vh-48px)] lg:flex flex-col lg:z-35 lg:bg-black/30 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
              {/* Header Fixed - Group Name + Edit */}
              {currentClass && (
                <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
                  <InlineClassEditor classObj={currentClass} isOwner={canManage} onDelete={handleDeleteClass} onUpdate={handleUpdateClass} classIndex={classIndex} classesCount={classes.length} />
                </div>
              )}

              {/* Form Fixed - Daftarkan Nama */}
              {currentClass && (
                <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
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

                      // Show join button
                      return (
                        <>
                          <p className="text-muted text-xs mb-2">
                            Daftarkan diri Anda di kelas ini untuk bisa upload foto.
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
                <div className="flex-1 flex flex-col gap-2 px-3 py-2">
                  {classes.map((c, idx) => {
                    const req = myRequestByClass[c.id] as ClassRequest | undefined
                    const hasPendingRequest = req?.status === 'pending'
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClassIndex(idx)
                          if (isCoverView) setView('classes')
                        }}
                        className={`p-2 rounded-lg text-left text-sm transition-colors touch-manipulation ${idx === classIndex && !isCoverView
                          ? 'bg-lime-600/20 border border-lime-500/50 text-lime-400'
                          : 'border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                          }`}
                      >
                        <p className="font-medium truncate">{c.name}</p>
                        {hasPendingRequest ? (
                          <p className="text-xs text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> menunggu persetujuan</p>
                        ) : (
                          <p className="text-xs text-muted">{(membersByClass[c.id]?.length ?? 0)} orang</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Add Group Button - Fixed at Bottom */}
              <div className="flex-shrink-0 px-3 py-2 border-t border-white/10">
                {canManage && (
                  <div className="flex gap-2">
                    {!addingClass ? (
                      <button type="button" onClick={() => setAddingClass(true)} className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation">
                        <Plus className="w-4 h-4 inline mr-1" /> Group
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Nama group" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-app placeholder:text-gray-600" autoFocus />
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
              <div className="hidden lg:flex lg:fixed lg:left-16 lg:top-12 lg:w-64 lg:h-[calc(100vh-48px)] lg:bg-black/40 lg:backdrop-blur-sm lg:border-l lg:border-white/10 lg:p-4 lg:z-35 lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto">
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
          <div className={`flex-1 flex flex-col gap-0 min-h-0 ${sidebarMode === 'classes' ? 'pt-14' : 'pt-0'} lg:pt-0`}>
            {/* Mobile class header - Fixed - Hide when in Approval/Team mode */}
            <div className={`fixed top-0 left-0 right-0 lg:hidden z-30 flex items-center gap-2 p-2 bg-black/50 backdrop-blur border-b border-white/10 touch-manipulation transition-colors ${sidebarMode !== 'classes' ? 'hidden' : 'flex'}`}>
              {isCoverView ? (
                <div className="flex-1 flex items-center justify-center h-10">
                  <span className="font-bold text-app flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-lime-400" />
                    Sampul Album
                  </span>
                </div>
              ) : addingClass ? (
                <div className="flex-1 flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Nama group baru"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-app text-sm focus:outline-none focus:border-lime-500 transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddClass}
                    disabled={!newClassName.trim()}
                    className="p-2 rounded-xl bg-lime-600 text-white disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingClass(false); setNewClassName('') }}
                    className="p-2 rounded-xl border border-white/10 text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={goPrevClass} disabled={classIndex === 0} className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-40 transition-colors touch-manipulation flex-shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0 flex justify-center">
                    <InlineClassEditor classObj={currentClass} isOwner={canManage} onDelete={handleDeleteClass} onUpdate={handleUpdateClass} classIndex={classIndex} classesCount={classes.length} center={true} />
                  </div>
                  <button type="button" onClick={goNextClass} disabled={classIndex >= classes.length - 1} className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-40 transition-colors touch-manipulation flex-shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile Class Drawer / Menu for switching groups */}
            {mobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
                <div className="fixed inset-y-0 left-0 z-[70] w-3/4 max-w-xs bg-[#0a0a0b] border-r border-white/10 flex flex-col shadow-2xl lg:hidden animate-in slide-in-from-left duration-300">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-app">Daftar Group</h2>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {classes.map((c, idx) => {
                      const req = myRequestByClass[c.id] as ClassRequest | undefined
                      const hasPendingRequest = req?.status === 'pending'
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClassIndex(idx)
                            if (isCoverView) setView('classes')
                            setMobileMenuOpen(false)
                          }}
                          className={`w-full p-3 rounded-xl text-left text-sm transition-all ${idx === classIndex
                            ? 'bg-lime-600/20 border border-lime-500/50 text-lime-400 font-medium'
                            : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{c.name}</span>
                            {idx === classIndex && <Check className="w-4 h-4 text-lime-400" />}
                          </div>
                          {hasPendingRequest ? (
                            <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> menunggu persetujuan</p>
                          ) : (
                            <p className="text-xs text-muted mt-0.5">{membersByClass[c.id]?.length ?? c.student_count ?? 0} anggota</p>
                          )}
                        </button>
                      )
                    })}

                  </div>
                  <div className="p-3 pb-8 border-t border-white/10 flex flex-col gap-2 bg-[#0a0a0b]">
                    {canManage && (
                      <button
                        onClick={() => {
                          setAddingClass(true)
                          setMobileMenuOpen(false)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-lime-600 text-white text-sm font-medium active:scale-95 transition-transform shadow-lg shadow-lime-900/20"
                      >
                        <Plus className="w-4 h-4" />
                        Group Baru
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setView('cover')
                        setMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 text-sm font-medium transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Kembali ke Sampul
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Form request access dihapus - sistem menggunakan link registrasi universal */}

            {/* Mobile Sambutan View - Removed, using grid layout */}

            {/* Main content - scrollable container */}
            <div className={`flex-1 overflow-y-auto rounded-t-none pb-40 lg:pb-0 ${sidebarMode === 'classes' && !isCoverView ? 'lg:ml-80' : 'lg:ml-0'}`}>
              {/* Show different content based on sidebarMode */}
              {isCoverView ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-full">
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
                          title="Play Video Sampul"
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
                          <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Gambar</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => coverUploadInputRef.current?.click()}
                              disabled={uploadingCover}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-lime-600/20 text-lime-400 hover:bg-lime-600/30 text-[11px] font-medium border border-lime-500/20 transition-all disabled:opacity-50 min-h-[36px]"
                            >
                              <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{uploadingCover ? 'Upload...' : 'Ubah'}</span>
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
                          <p className="text-[10px] font-medium text-muted/60 uppercase tracking-wide mb-1.5">Video</p>
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

                        {/* Hidden inputs */}
                        <input
                          ref={coverUploadInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && setCoverPreview) {
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
              ) : sidebarMode === 'approval' ? (
                /* Approval Content - New Join Request System */
                <div className="max-w-4xl mx-auto px-2 py-3 sm:p-4">
                  {/* Header dengan Stats */}
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-2xl font-bold text-app mb-2 text-center">Approval Pendaftaran</h2>
                    {joinStats && (
                      <div className="grid grid-cols-3 gap-2 mt-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 sm:mt-4">
                        <div className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-full bg-lime-600/20 border border-lime-500/30 flex items-center justify-center gap-1 sm:gap-2">
                          <span className="text-lime-400 font-medium text-xs sm:text-base">
                            {joinStats.approved_count}/{joinStats.limit_count || '∞'}
                          </span>
                          {canManage && !editingLimit && (
                            <button
                              onClick={() => {
                                setEditLimitValue(String(joinStats.limit_count || ''))
                                setEditingLimit(true)
                              }}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-lime-500/20 hover:bg-lime-500/40 text-lime-400 flex items-center justify-center transition-colors"
                              title="Ubah batas maksimal"
                            >
                              <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </button>
                          )}
                        </div>
                        <div className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-600/20 border border-amber-500/30 text-center">
                          <span className="text-amber-400 font-medium text-xs sm:text-base">
                            {joinStats.pending_count} Pending
                          </span>
                        </div>
                        {joinStats.available_slots !== 999999 ? (
                          <div className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-600/20 border border-blue-500/30 text-center">
                            <span className="text-blue-400 font-medium text-xs sm:text-base">
                              {joinStats.available_slots} Sisa
                            </span>
                          </div>
                        ) : <div />}
                      </div>
                    )}

                    {/* Edit Limit Inline */}
                    {editingLimit && (
                      <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs sm:text-sm text-gray-400">Maks:</span>
                        <input
                          type="number"
                          min={joinStats?.limit_count || 1}
                          value={editLimitValue}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v < (joinStats?.limit_count || 1)) return
                            setEditLimitValue(e.target.value)
                          }}
                          className="w-20 sm:w-24 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-center text-base sm:text-lg font-bold focus:outline-none focus:border-lime-500"
                        />
                        <button
                          onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + 10))}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          disabled={savingLimit}
                          onClick={async () => {
                            const val = parseInt(editLimitValue)
                            const currentLimit = joinStats?.limit_count || 0
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
                                body: JSON.stringify({ students_count: val })
                              })
                              if (res.ok) {
                                toast.success(`Batas diubah menjadi ${val} orang`)
                                setEditingLimit(false)
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
                          }}
                          className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {savingLimit ? 'Simpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={() => setEditingLimit(false)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {/* Link Undangan */}
                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs sm:text-sm text-gray-400 mb-2 text-center">Link Undangan:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register/${album?.id || ''}`}
                          readOnly
                          className="flex-1 min-w-0 px-2 sm:px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-app text-xs sm:text-sm truncate"
                        />
                        <button
                          onClick={() => {
                            if (album?.id) {
                              const url = `${window.location.origin}/register/${album.id}`
                              navigator.clipboard.writeText(url)
                              toast.success('Link berhasil disalin!')
                            }
                          }}
                          className="px-3 sm:px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Salin
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-white/10">
                    <button
                      onClick={() => setApprovalTab('pending')}
                      className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors relative ${
                        approvalTab === 'pending'
                          ? 'text-lime-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Belum Di-acc
                      {joinStats && joinStats.pending_count > 0 && (
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 text-[10px] sm:text-xs font-semibold">
                          {joinStats.pending_count}
                        </span>
                      )}
                      {approvalTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />
                      )}
                    </button>
                    <button
                      onClick={() => setApprovalTab('approved')}
                      className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors relative ${
                        approvalTab === 'approved'
                          ? 'text-lime-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Sudah Di-acc
                      {joinStats && joinStats.approved_count > 0 && (
                        <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-lime-600/20 text-lime-400 text-[10px] sm:text-xs font-semibold">
                          {joinStats.approved_count}
                        </span>
                      )}
                      {approvalTab === 'approved' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />
                      )}
                    </button>
                  </div>

                  {/* Requests List - Grouped by Class */}
                  {joinRequests.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 border-2 border-dashed border-white/10 rounded-xl">
                      <ClipboardList className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-600" />
                      <p className="text-sm sm:text-base text-app font-medium mb-1">
                        {approvalTab === 'pending' ? 'Tidak ada request pending' : 'Belum ada yang di-approve'}
                      </p>
                      <p className="text-sm text-muted">
                        {approvalTab === 'pending' ? 'Semua permintaan sudah diproses' : 'Approve request untuk menampilkan di sini'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        // Group requests by class
                        // For approved: group by assigned_class_id
                        // For pending: group by class_name (from registration form)
                        const requestsByGroup: Record<string, typeof joinRequests> = {}
                        joinRequests.forEach(request => {
                          let groupKey: string
                          if (request.status === 'approved' && request.assigned_class_id) {
                            groupKey = `id:${request.assigned_class_id}`
                          } else if (request.class_name) {
                            groupKey = `name:${request.class_name}`
                          } else {
                            groupKey = 'unassigned'
                          }
                          if (!requestsByGroup[groupKey]) {
                            requestsByGroup[groupKey] = []
                          }
                          requestsByGroup[groupKey].push(request)
                        })

                        // Sort: unassigned first, then by class name
                        const sortedGroupKeys = Object.keys(requestsByGroup).sort((a, b) => {
                          if (a === 'unassigned') return -1
                          if (b === 'unassigned') return 1
                          const nameA = a.startsWith('id:') 
                            ? (classes.find(c => c.id === a.slice(3))?.name || '') 
                            : a.slice(5)
                          const nameB = b.startsWith('id:') 
                            ? (classes.find(c => c.id === b.slice(3))?.name || '') 
                            : b.slice(5)
                          return nameA.localeCompare(nameB)
                        })

                        return sortedGroupKeys.map(groupKey => {
                          const classRequests = requestsByGroup[groupKey]
                          let classObj: (typeof classes)[0] | null = null
                          let groupLabel: string

                          if (groupKey === 'unassigned') {
                            groupLabel = 'Belum Ditentukan Kelas'
                          } else if (groupKey.startsWith('id:')) {
                            classObj = classes.find(c => c.id === groupKey.slice(3)) || null
                            groupLabel = classObj?.name || 'Kelas Tidak Ditemukan'
                          } else {
                            // groupKey starts with 'name:'
                            const className = groupKey.slice(5)
                            classObj = classes.find(c => c.name === className) || null
                            groupLabel = className
                          }

                          return (
                            <div key={groupKey} className="mb-4 sm:mb-6">
                              {/* Class Header */}
                              <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-white/20">
                                <div className="w-1 h-4 sm:h-5 bg-lime-500 rounded-full" />
                                <h3 className="text-sm sm:text-lg font-bold text-app">
                                  {groupLabel}
                                </h3>
                                <span className="ml-auto px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/10 text-app text-[10px] sm:text-xs font-semibold">
                                  {classRequests.length}
                                </span>
                              </div>

                              {/* Members in this class */}
                              <div className="flex flex-col gap-1.5 sm:gap-2">
                                {classRequests.map(request => {
                                  const isAssigning = assigningRequest === request.id

                                  return (
                                    <div key={request.id} className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                      <div className="flex flex-col gap-1.5 sm:gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm sm:text-base text-app font-medium truncate">{request.student_name}</p>
                                            <p className="text-[10px] sm:text-xs text-muted mt-0.5 truncate">{request.email}</p>
                                            {request.phone && (
                                              <p className="text-[10px] sm:text-xs text-muted truncate">WA: {request.phone}</p>
                                            )}
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                                              {new Date(request.requested_at).toLocaleString('id-ID')}
                                            </p>
                                          </div>
                                          
                                          {request.status === 'approved' && classObj && (
                                            <div className="flex-shrink-0">
                                              <span className="px-2 py-1 rounded bg-lime-600/20 text-lime-400 border border-lime-500/30 text-xs font-medium whitespace-nowrap">
                                                ✓ {classObj.name}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Action Buttons for Pending */}
                                        {request.status === 'pending' && (
                                          <>
                                            {isAssigning ? (
                                              <div className="flex flex-col gap-2 p-2 bg-black/20 rounded-lg border border-white/10">
                                                <label className="text-xs text-gray-300 font-medium">Pilih Group/Kelas:</label>
                                                <select
                                                  value={selectedClassForAssign}
                                                  onChange={(e) => setSelectedClassForAssign(e.target.value)}
                                                  className="px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-lime-500 [&>option]:bg-gray-800 [&>option]:text-white"
                                                >
                                                  <option value="" className="bg-gray-800 text-white">-- Pilih Kelas --</option>
                                                  {classes.map(cls => (
                                                    <option key={cls.id} value={cls.id} className="bg-gray-800 text-white">{cls.name}</option>
                                                  ))}
                                                </select>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => handleApproveJoinRequest(request.id, selectedClassForAssign)}
                                                    disabled={!selectedClassForAssign}
                                                    className="flex-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                                                  >
                                                    ✓ Konfirmasi
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setAssigningRequest(null)
                                                      setSelectedClassForAssign('')
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 text-xs font-medium transition-colors"
                                                  >
                                                    Batal
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => setAssigningRequest(request.id)}
                                                  className="flex-1 px-3 py-1.5 rounded-lg bg-green-600/80 text-white hover:bg-green-600 text-xs font-medium transition-colors"
                                                >
                                                  ✓ Setujui
                                                </button>
                                                <button
                                                  onClick={() => handleRejectJoinRequest(request.id)}
                                                  className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-600 text-xs font-medium transition-colors"
                                                >
                                                  ✕ Tolak
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </>
                  )}
                </div>
              ) : sidebarMode === 'team' ? (
                /* Team Content */
                <div className="max-w-4xl mx-auto p-4">
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-app mb-2">Manajemen Tim ({members.length} orang)</h2>
                    <p className="text-sm text-muted">Kelola admin dan akses anggota album</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {members.map((member, idx) => (
                      <div key={member.user_id || `member-${idx}`} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-app font-medium">
                              {member.name || member.email}
                              {currentUserId && member.user_id === currentUserId && (
                                <span className="ml-2 text-xs text-lime-400 font-semibold">(Anda)</span>
                              )}
                            </p>
                            {member.name && <p className="text-xs text-muted mt-1">{member.email}</p>}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {member.role === 'owner' && <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">Owner</span>}
                              {member.role === 'admin' && <span className="text-xs px-2 py-1 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30">Admin</span>}
                              {member.role === 'member' && <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Member</span>}
                              {member.role === 'student' && <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">Member</span>}
                              {member.role === 'no-account' && <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Belum Login</span>}
                            </div>
                          </div>
                          {(isOwner || canManage) && member.user_id && member.role !== 'owner' && (
                            <div className="flex gap-2 flex-shrink-0">
                              {(isOwner || isGlobalAdmin) && (
                                <>
                                  {member.role !== 'admin' ? (
                                    <button
                                      onClick={() => handleUpdateRoleWrapper(member.user_id, 'admin')}
                                      className="px-3 py-2 rounded-lg text-sm bg-lime-600/20 text-lime-400 hover:bg-lime-600 hover:text-white transition-colors border border-lime-500/20"
                                    >
                                      Jadikan Admin
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateRoleWrapper(member.user_id, 'member')}
                                      className="px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                                    >
                                      Hapus Admin
                                    </button>
                                  )}
                                </>
                              )}
                              {canManage && (
                                <button
                                  onClick={() => handleRemoveMemberWrapper(member.user_id)}
                                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                  title="Hapus akses sepenuhnya"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          )}
                          {(isOwner || canManage) && !member.user_id && (
                            <div className="text-sm text-muted italic">
                              Menunggu login
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-app font-medium mb-1">Belum ada anggota</p>
                        <p className="text-sm text-muted">Siswa yang bergabung ke group akan muncul di sini</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : sidebarMode === 'sambutan' ? (
                /* Sambutan Content - Grid Cards like Students */
                <div className="p-2 lg:p-4">
                  {/* Add Teacher Button */}
                  {canManage && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt('Nama Guru:')
                          if (name) handleAddTeacher(name, '')
                        }}
                        className="px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Guru
                      </button>
                    </div>
                  )}

                  {teachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60 min-h-[70vh] w-full">
                      <Users className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-center text-sm lg:text-base">Belum ada guru ditambahkan.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {teachers.map((teacher) => (
                        <TeacherCard
                          key={teacher.id}
                          teacher={teacher}
                          isOwner={canManage}
                          isFlipped={editingTeacherId === teacher.id}
                          onStartEdit={(t) => setEditingTeacherId(t.id)}
                          onCancelEdit={() => setEditingTeacherId(null)}
                          onSave={(updatedData) => {
                            handleUpdateTeacher(teacher.id, updatedData)
                            setEditingTeacherId(null)
                          }}
                          onDelete={(teacherId) => handleDeleteTeacher(teacherId, teacher.name)}
                          onUploadPhoto={(teacherId) => {
                            if (teacherPhotoInputRef.current) {
                              uploadTeacherPhotoTargetRef.current = teacherId
                              teacherPhotoInputRef.current.click()
                            }
                          }}
                          onDeletePhoto={handleDeleteTeacherPhoto}
                          onUploadVideo={(teacherId) => {
                            if (teacherVideoInputRef.current) {
                              uploadTeacherVideoTargetRef.current = teacherId
                              teacherVideoInputRef.current.click()
                            }
                          }}
                          onPlayVideo={(videoUrl) => {
                            setTeacherVideoViewer({ teacher, videoUrl })
                          }}
                          onClickPhoto={(teacher, photoIndex) => {
                            setTeacherPhotoViewer({ teacher, photoIndex })
                          }}
                          savingTeacher={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : sidebarMode === 'classes' && classes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl py-12">
                  <p className="text-app font-medium mb-2">Belum ada group</p>
                  {canManage && !addingClass && (
                    <button type="button" onClick={() => setAddingClass(true)} className="mt-4 px-4 py-2 rounded-xl bg-lime-600 text-white">
                      <Plus className="w-4 h-4 inline mr-2" /> Tambah Group
                    </button>
                  )}
                  {canManage && addingClass && (
                    <div className="mt-4 flex flex-col gap-2 max-w-xs w-full">
                      <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Nama group" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-app" autoFocus />
                      <div className="flex gap-2">
                        <button type="button" onClick={handleAddClass} className="px-4 py-2 rounded-lg bg-lime-600 text-white">Tambah</button>
                        <button type="button" onClick={() => { setAddingClass(false); setNewClassName('') }} className="px-4 py-2 rounded-lg border border-white/10 text-app">Batal</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : sidebarMode === 'classes' ? (
                /* Classes Content - Original grid view */
                (() => {
                  const access = myAccessByClass[currentClass.id]
                  const hasApprovedAccess = access?.status === 'approved'
                  const members = membersByClass[currentClass.id] ?? []

                  return (
                    <div className="p-2 lg:p-4">
                      {members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-60 min-h-[70vh] w-full">
                          <Users className="w-12 h-12 mb-3 opacity-50" />
                          <p className="text-center text-sm lg:text-base">Belum ada anggota terdaftar di group ini.</p>
                        </div>
                      ) : classViewMode === 'list' ? (
                        <div className="space-y-1">
                          {members.map((m, idx) => (
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
                                      className="px-2 py-1 text-xs rounded-lg bg-lime-600/20 text-lime-400 hover:bg-lime-600/30 flex-shrink-0"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Hapus ${m.student_name}?`)) {
                                          handleSaveProfile(currentClass.id, true, m.is_me ? undefined : m.user_id)
                                        }
                                      }}
                                      className="p-1.5 text-xs rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                                      title="Hapus member"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {members.map((m, idx) => {
                            const firstPhoto = m.photos?.[0] || firstPhotoByStudent?.[m.student_name]
                            const isFlipped = editingProfileClassId === currentClass.id && ((m.is_me && !editingMemberUserId) || editingMemberUserId === m.user_id)

                            return (
                              <div key={m.user_id} className="relative h-full min-h-[620px]" style={{ perspective: '1000px' }}>
                                <div
                                  style={{
                                    transformStyle: 'preserve-3d',
                                    transition: 'transform 0.6s',
                                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                  }}
                                  className="relative w-full h-full"
                                >
                                  {/* Front Side - Profile View */}
                                  <div
                                    className="relative w-full h-full min-h-[520px] backface-hidden rounded-xl border border-white/10 bg-[#0a0a0b] flex flex-col items-stretch text-left shadow-2xl overflow-hidden"
                                    style={{ backfaceVisibility: 'hidden' }}
                                  >
                                    {/* Foto section */}
                                    {firstPhoto && (
                                      <div className="relative aspect-square overflow-hidden bg-white/5 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPersonalIndex(idx)
                                            setPersonalCardExpanded(true)
                                            setEditingProfileClassId(null)
                                          }}
                                          className="w-full h-full hover:opacity-90 transition-opacity"
                                        >
                                          <img src={firstPhoto} alt={m.student_name} className="w-full h-full object-cover" />
                                        </button>
                                        {/* Video Play Button Overlay */}
                                        {m.video_url && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (onPlayVideo) {
                                                onPlayVideo(m.video_url!)
                                              }
                                            }}
                                            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center group transition-all hover:scale-110"
                                            title="Play Video"
                                          >
                                            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Profile info section */}
                                    <div className="flex flex-col flex-1 p-3 lg:p-4">
                                      {/* Name & Email Group */}
                                      <div className="mb-1">
                                        <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                                          {m.student_name}
                                          {m.is_me ? <span className="font-normal text-lime-400 ml-1 text-xs">(Anda)</span> : ''}
                                        </h3>
                                        {m.email && <p className="text-gray-400 text-sm line-clamp-1">{m.email}</p>}
                                      </div>

                                      {/* Details Group */}
                                      <div className="space-y-0 lg:space-y-1 text-sm text-gray-300 leading-tight">
                                        {m.date_of_birth && (
                                          <p className="line-clamp-1 flex items-center gap-2">
                                            <Cake className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{m.date_of_birth}</span>
                                          </p>
                                        )}
                                        {m.instagram && (
                                          <a
                                            href={m.instagram.startsWith('http') ? m.instagram : `https://instagram.com/${m.instagram.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 hover:text-white transition-colors line-clamp-1 group/ig"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Instagram className="w-4 h-4 text-gray-400 group-hover/ig:text-pink-500 transition-colors" />
                                            <span className="truncate">
                                              {m.instagram.includes('instagram.com')
                                                ? '@' + m.instagram.split('/').filter(Boolean).pop()
                                                : m.instagram.startsWith('@') ? m.instagram : '@' + m.instagram
                                              }
                                            </span>
                                          </a>
                                        )}
                                        {m.message && (
                                          <p
                                            className="italic text-gray-400 overflow-hidden leading-tight"
                                            style={{ display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }}
                                          >
                                            "{m.message}"
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action buttons - Bottom of front card in separate footer */}
                                    <div className="px-3 pt-0 pb-6 mt-auto">
                                      <div className="flex gap-2 h-8">
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
                                            className="flex-1 text-xs font-medium rounded-lg bg-lime-900/40 text-lime-400 hover:bg-lime-900/60 border border-lime-500/20 transition-colors flex items-center justify-center gap-1.5"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" /> Edit
                                          </button>
                                        )}
                                        {canManage && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Hapus ${m.student_name}?`)) {
                                                handleSaveProfile(currentClass.id, true, m.is_me ? undefined : m.user_id)
                                              }
                                            }}
                                            className="w-8 text-xs rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 transition-colors flex items-center justify-center"
                                            title="Hapus member"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Back Side - Edit Form */}
                                  <div
                                    style={{
                                      backfaceVisibility: 'hidden',
                                      WebkitBackfaceVisibility: 'hidden',
                                      transform: 'rotateY(180deg)',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                    }}
                                    className="flex flex-col rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden p-4"
                                  >
                                    <div className="flex-1 overflow-y-auto">
                                      <h3 className="text-app font-medium text-xs mb-2 flex items-center gap-1">
                                        <Edit3 className="w-3 h-3" />
                                        Edit Profil
                                      </h3>
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          value={editProfileName}
                                          onChange={(e) => setEditProfileName(e.target.value)}
                                          placeholder="Nama"
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                                        />
                                        <input
                                          type="email"
                                          value={editProfileEmail}
                                          onChange={(e) => setEditProfileEmail(e.target.value)}
                                          placeholder="Email"
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                                        />
                                        <input
                                          type="text"
                                          value={editProfileTtl}
                                          onChange={(e) => setEditProfileTtl(e.target.value)}
                                          placeholder="TTL (YYYY-MM-DD)"
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                                        />
                                        <input
                                          type="text"
                                          value={editProfileInstagram}
                                          onChange={(e) => setEditProfileInstagram(e.target.value)}
                                          placeholder="IG (@username)"
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                                        />
                                        {/* Upload Foto dari Local */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (fileInputRef.current) {
                                              uploadPhotoTargetRef.current = { classId: currentClass.id, studentName: m.student_name }
                                              fileInputRef.current.click()
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 rounded text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1"
                                        >
                                          <ImagePlus className="w-3 h-3" />
                                          Upload Foto
                                        </button>

                                        {/* Preview Foto dengan tombol hapus */}
                                        {studentPhotosInCard.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-white/60 text-[9px] uppercase">Foto Anda ({studentPhotosInCard.length})</p>
                                            <div className="grid grid-cols-3 gap-1">
                                              {studentPhotosInCard.map((photo, idx) => (
                                                <div key={photo.id} className="relative aspect-square rounded overflow-hidden bg-white/5 group">
                                                  <img
                                                    src={photo.file_url}
                                                    alt={`Foto ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      if (confirm(`Hapus foto ${idx + 1}?`)) {
                                                        if (onDeletePhoto) {
                                                          onDeletePhoto(photo.id, currentClass.id, m.student_name)
                                                        }
                                                      }
                                                    }}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                    title={`Hapus foto ${idx + 1}`}
                                                  >
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <input
                                          type="url"
                                          value={editProfileVideoUrl}
                                          onChange={(e) => setEditProfileVideoUrl(e.target.value)}
                                          placeholder="URL Video (YouTube, dll)"
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app"
                                        />
                                        {/* Upload Video dari Local */}
                                        <div className="flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (videoInputRef.current) {
                                                uploadVideoTargetRef.current = { classId: currentClass.id, studentName: m.student_name }
                                                videoInputRef.current.click()
                                              }
                                            }}
                                            className="flex-1 px-2 py-1.5 rounded text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                                          >
                                            <Video className="w-3 h-3" />
                                            Upload Video
                                          </button>
                                          {m.video_url && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (confirm('Hapus video?')) {
                                                  setEditProfileVideoUrl('')
                                                }
                                              }}
                                              className="px-2 py-1.5 rounded text-[10px] bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                                              title="Hapus Video"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                        <textarea
                                          value={editProfilePesan}
                                          onChange={(e) => setEditProfilePesan(e.target.value)}
                                          placeholder="Pesan"
                                          rows={2}
                                          className="w-full px-2 py-1 rounded text-[10px] bg-white/5 border border-white/10 text-app resize-none"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveProfile(currentClass.id, false, editingMemberUserId ?? undefined)}
                                        disabled={savingProfile}
                                        className="flex-1 px-2 py-1 rounded text-[10px] bg-lime-600 text-white font-medium hover:bg-lime-500 disabled:opacity-50"
                                      >
                                        {savingProfile ? 'Simpan...' : 'Simpan'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setEditingProfileClassId(null); setEditingMemberUserId?.(null) }}
                                        className="flex-1 px-2 py-1 rounded text-[10px] border border-white/10 text-app font-medium hover:bg-white/5"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                      }
                    </div>
                  )
                })()
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}