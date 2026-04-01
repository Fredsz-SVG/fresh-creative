import { useCallback, useState, useRef, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/api-client'
import type { Album } from '../types'
import { asString, asObject, asStringArray, asNumberRecord } from '../utils/response-narrowing'

export function useYearbookAlbumData(id: string | undefined, initialAlbum: Album | null = null) {
  const storageKey = id ? `yearbook-album-cache-${id}` : null

  const getCachedAlbum = (): Album | null => {
    if (typeof window === 'undefined' || !storageKey) return null
    try {
      const raw = window.sessionStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { data?: Album }
      return (parsed?.data as Album) || null
    } catch {
      return null
    }
  }

  const [album, setAlbum] = useState<Album | null>(() => initialAlbum || getCachedAlbum() || null)
  const [loading, setLoading] = useState(() => !(initialAlbum || getCachedAlbum()))
  const [error, setError] = useState<string | null>(null)
  const albumRef = useRef(album)

  useEffect(() => {
    albumRef.current = album
  }, [album])

  // Persist latest album snapshot for fast re-entry.
  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return
    if (!album) return
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ data: album, ts: Date.now() }))
    } catch {
      // ignore storage errors
    }
  }, [album, storageKey])

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
        if (typeof window !== 'undefined' && storageKey) {
          try { window.sessionStorage.removeItem(storageKey) } catch { }
        }
        return
      }
      if (asString(data.type) !== 'yearbook') {
        setError('Bukan album yearbook')
        setAlbum(null)
        if (typeof window !== 'undefined' && storageKey) {
          try { window.sessionStorage.removeItem(storageKey) } catch { }
        }
        return
      }
      setAlbum(data as Album)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id, storageKey])

  // If there is cached/initial album, do silent refresh in background.
  useEffect(() => {
    if (!id) return
    if (!album) return
    void fetchAlbum(true)
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
