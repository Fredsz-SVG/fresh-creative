import { useCallback, useState, useRef } from 'react'
import { fetchWithAuth } from '@/lib/api-client'
import type { ClassMember, Photo } from '../types'

export function useYearbookMembers(
  id: string | undefined,
  initialMembers?: Record<string, ClassMember[]>
) {
  const [membersByClass, setMembersByClass] = useState<Record<string, ClassMember[]>>(initialMembers || {})
  const [firstPhotoByStudentByClass, setFirstPhotoByStudentByClass] = useState<Record<string, Record<string, string>>>({})
  const [studentPhotosInCard, setStudentPhotosInCard] = useState<Photo[]>([])
  const [studentNameForPhotosInCard, setStudentNameForPhotosInCard] = useState<string | null>(null)
  const [studentPhotoIndexInCard, setStudentPhotoIndexInCard] = useState(0)

  const isFetchingMembersRef = useRef(false)

  const fetchFirstPhotosForClass = useCallback(async (classId: string) => {
    if (!id) return
    if (classId.startsWith('temp-')) return
    const res = await fetchWithAuth(
      `/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}`,
      { credentials: 'include', cache: 'no-store' }
    )
    const list = await res.json().catch(() => []) as { student_name: string; file_url: string }[]
    if (!Array.isArray(list)) return
    const map: Record<string, string> = {}
    for (const p of list) {
      if (p.student_name && p.file_url && !map[p.student_name]) map[p.student_name] = p.file_url
    }
    setFirstPhotoByStudentByClass((prev) => ({ ...prev, [classId]: map }))
  }, [id])

  const fetchMembersForClass = useCallback(async (classId: string) => {
    if (!id) return
    const res = await fetchWithAuth(
      `/api/albums/${id}/classes/${classId}/members`,
      { credentials: 'include', cache: 'no-store' }
    )
    const data = await res.json().catch(() => [])
    if (Array.isArray(data)) {
      setMembersByClass((prev) => ({ ...prev, [classId]: data }))
    }
  }, [id])

  const fetchMembersForAllClasses = useCallback(async (classes: any[]) => {
    if (!id) return
    await Promise.all(classes.map((c) => fetchMembersForClass(c.id)))
  }, [id, fetchMembersForClass])

  const fetchAllClassMembers = useCallback(async (albumRef: React.MutableRefObject<any>) => {
    if (!id || isFetchingMembersRef.current) return
    try {
      isFetchingMembersRef.current = true
      const res = await fetchWithAuth(`/api/albums/${id}/all-class-members`, {
        credentials: 'include',
        cache: 'no-store'
      })
      const data = await res.json().catch(() => [])

      const groupedMembers: Record<string, ClassMember[]> = {}

      const currentClasses = albumRef.current?.classes
      if (currentClasses) {
        currentClasses.forEach((c: any) => {
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
    } finally {
      isFetchingMembersRef.current = false
    }
  }, [id])

  const fetchStudentPhotosForCard = useCallback(async (classId: string, studentName: string) => {
    if (!id) return
    setStudentNameForPhotosInCard(studentName)
    try {
      const res = await fetchWithAuth(
        `/api/albums/${id}/photos?class_id=${encodeURIComponent(classId)}&student_name=${encodeURIComponent(studentName)}`,
        { credentials: 'include', cache: 'no-store' }
      )
      const photoList = await res.json().catch(() => [])
      if (Array.isArray(photoList)) {
        const photoObjects: Photo[] = photoList.map((p: any, index: number) => ({
          id: p.id ?? `${studentName}-${index}`,
          file_url: p.file_url,
          student_name: p.student_name ?? studentName
        }))
        setStudentPhotosInCard(photoObjects)
        setStudentPhotoIndexInCard(0)
      }
    } catch (error) {
      console.error('Error fetching student photos:', error)
    }
  }, [id])

  return {
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
    fetchFirstPhotosForClass,
    fetchMembersForClass,
    fetchMembersForAllClasses,
    fetchAllClassMembers,
    fetchStudentPhotosForCard
  }
}
