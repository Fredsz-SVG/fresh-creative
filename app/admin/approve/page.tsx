'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminApprovePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/albums')
  }, [router])
  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent" />
    </div>
  )
}
