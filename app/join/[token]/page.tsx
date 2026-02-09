'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function JoinAlbumPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string | undefined
  const [status, setStatus] = useState<'loading' | 'login_required' | 'joining' | 'success' | 'error'>('loading')
  const [albumName, setAlbumName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Link undangan tidak valid.')
      return
    }

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        const res = await fetch(`/api/albums/invite/${encodeURIComponent(token)}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.name) setAlbumName(data.name)
        setStatus('login_required')
        return
      }

      setStatus('joining')
      const res = await fetch(`/api/albums/invite/${encodeURIComponent(token)}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(typeof data?.error === 'string' ? data.error : 'Gagal bergabung.')
        return
      }

      setStatus('success')
      const albumId = data?.albumId
      if (albumId) {
        router.replace(`/user/portal/album/yearbook/${albumId}`)
      } else {
        router.replace('/user/portal/albums')
      }
    }

    run()
  }, [token, router])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="text-center">
          <p className="text-red-400">{errorMessage}</p>
          <Link href="/login" className="mt-4 inline-block text-sky-400 hover:underline">Ke login</Link>
        </div>
      </div>
    )
  }

  if (status === 'login_required') {
    const loginUrl = `/login?next=${encodeURIComponent(`/join/${token}`)}`
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-app">Undangan Album</h1>
          {albumName && <p className="text-app font-medium">Anda diundang ke: {albumName}</p>}
          <p className="text-muted">Silakan login atau daftar untuk bergabung ke album.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={loginUrl}
              className="px-4 py-3 rounded-xl bg-lime-600 text-white font-semibold hover:bg-lime-700"
            >
              Login
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}
              className="px-4 py-3 rounded-xl border border-white/20 text-app font-semibold hover:bg-white/5"
            >
              Daftar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'joining' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-lime-500 border-t-transparent" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="text-center">
          <p className="text-red-400">{errorMessage}</p>
          <Link href="/user/portal/albums" className="mt-4 inline-block text-sky-400 hover:underline">Ke Album Saya</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-lime-500 border-t-transparent" />
    </div>
  )
}
