'use client'

import { useParams } from 'next/navigation'
import AlbumRegisterForm from '@/components/register/AlbumRegisterForm'

export default function AlbumJoinPage() {
  const params = useParams()
  const albumId = params?.id as string

  if (!albumId) return null

  return (
    <AlbumRegisterForm
      albumId={albumId}
      loginReturnPath={`/register/${albumId}`}
    />
  )
}
