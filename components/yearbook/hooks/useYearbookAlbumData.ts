import { useCallback, useState, useRef, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/api-client'
import type { Album } from '../types'
import { asString, asObject, asStringArray, asNumberRecord } from '../utils/response-narrowing'

export function useYearbookAlbumData(id: string | undefined, initialAlbum: Album | null = null) {
  const [album, setAlbum] = useState<Album | null>(initialAlbum || null)
  const [loading, setLoading] = useState(!initialAlbum)
  const [error, setError] = useState<string | null>(null)
  const albumRef = useRef(album)

  useEffect(() => {
    albumRef.current = album
  }, [album])

  const fetchAlbum = useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetchWithAuth(`/api/albums/${id}`, { credentials: 'include', cache: 'no-store' })
      const data = asObject(await res.json().catch(() => ({})))
      if (!res.ok) {
        setError(data.error ? asString(data.error) || 'Album tidak ditemukan' : 'Album tidak ditemukan')
        setAlbum(null)
        return
      }
      if (asString(data.type) !== 'yearbook') {
        setError('Bukan album yearbook')
        setAlbum(null)
        return
      }
      setAlbum(data as Album)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])

  const handleUpdateAlbum = useCallback(async (updates: {
    description?: string
    cover_image_url?: string
    students_count?: number
    flipbook_mode?: 'manual'
    total_estimated_price?: number
  }) => {
    if (!id) return null
    // Optimistic update
    setAlbum((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
    // Background API call
    return fetchWithAuth(`/api/albums/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(res => {
      if (!res.ok) {
        fetchAlbum(true)
        return null
      }
      return res.json()
    }).catch(() => {
      fetchAlbum(true)
      return null
    })
  }, [id, fetchAlbum])

  return { album, setAlbum, loading, error, fetchAlbum, handleUpdateAlbum, albumRef }
}
