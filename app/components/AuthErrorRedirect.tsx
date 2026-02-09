'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Jika user sampai di landing (/) dengan error auth di URL (mis. link konfirmasi
 * kadaluarsa), redirect ke /login dengan pesan yang terbaca.
 */
export default function AuthErrorRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/') return

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hashParams = hash ? new URLSearchParams(hash.slice(1)) : null

    const error = params.get('error') ?? hashParams?.get('error')
    const errorCode = params.get('error_code') ?? hashParams?.get('error_code')

    if (error === 'access_denied' && errorCode === 'otp_expired') {
      const message = 'Link konfirmasi sudah kadaluarsa atau tidak valid. Silakan login atau daftar lagi.'
      router.replace(`/login?error=${encodeURIComponent(message)}`)
    } else if (error) {
      const desc = params.get('error_description') ?? hashParams?.get('error_description') ?? error
      router.replace(`/login?error=${encodeURIComponent(desc)}`)
    }
  }, [pathname, router])

  return null
}
