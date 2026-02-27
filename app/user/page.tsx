'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function UserRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const q = searchParams.toString()
    router.replace(`/user/portal${q ? `?${q}` : ''}`)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
}

export default function UserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <UserRedirect />
    </Suspense>
  )
}
