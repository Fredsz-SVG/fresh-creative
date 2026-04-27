import { useEffect, useState } from 'react'
import { onAuthChange } from '@/lib/auth-client'

export function useCurrentUserId() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setCurrentUserId(user?.uid ?? null)
    })
    return () => unsub()
  }, [])

  return currentUserId
}
