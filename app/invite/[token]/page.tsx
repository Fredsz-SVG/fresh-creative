'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import AlbumRegisterForm from '@/components/register/AlbumRegisterForm'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  if (!token) return null

  return (
    <AlbumRegisterForm
      token={token}
      loginReturnPath={`/invite/${token}`}
      onClose={handleClose}
    />
  )
}
