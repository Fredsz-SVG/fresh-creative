import { useEffect, useRef } from 'react'
import type { ClassAccess, ClassRequest } from '../types'

type InitialAccess = {
  access: Record<string, ClassAccess | null>
  requests: Record<string, ClassRequest | null>
}

export function useYearbookSyncLifecycle(params: {
  id: string | undefined
  view: 'cover' | 'classes' | 'gallery'
  initialAccess: InitialAccess | undefined
  initialMembers: Record<string, unknown> | undefined
  albumClassesLength: number | undefined
  fetchAlbum: (silent?: boolean) => Promise<void> | void
  fetchAllAccess: () => Promise<void> | void
  fetchAllClassMembers: () => Promise<void> | void
}) {
  const {
    id,
    view,
    initialAccess,
    initialMembers,
    albumClassesLength,
    fetchAlbum,
    fetchAllAccess,
    fetchAllClassMembers,
  } = params
  const lastVisibleSyncRef = useRef(0)
  const VISIBLE_SYNC_COOLDOWN_MS = 30000

  useEffect(() => {
    if ((view !== 'classes' && view !== 'cover') || !id) return
    if (!initialAccess?.access || Object.keys(initialAccess.access).length === 0) {
      void fetchAllAccess()
    }
  }, [view, id, fetchAllAccess, initialAccess])

  useEffect(() => {
    if (!id) return
    const onVisible = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - lastVisibleSyncRef.current < VISIBLE_SYNC_COOLDOWN_MS) return
      lastVisibleSyncRef.current = now
      void fetchAlbum(true)
      void fetchAllAccess()
      void fetchAllClassMembers()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [id, fetchAlbum, fetchAllAccess, fetchAllClassMembers])

  useEffect(() => {
    if (!id || !albumClassesLength) return
    if (!initialMembers || Object.keys(initialMembers).length === 0) {
      void fetchAllClassMembers()
    }
  }, [id, albumClassesLength, fetchAllClassMembers, initialMembers])
}
