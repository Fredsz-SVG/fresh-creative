import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useCurrentUserId() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (mounted && user) setCurrentUserId(user.id)
    }
    fetchCurrentUser()
    return () => {
      mounted = false
    }
  }, [])

  return currentUserId
}
