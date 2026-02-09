'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(!!(code || (tokenHash && type === 'recovery')))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Jika ada ?code= → redirect ke auth/callback (server) agar PKCE code verifier dari cookie dipakai
  useEffect(() => {
    if (code) {
      const url = new URL('/auth/callback', window.location.origin)
      url.searchParams.set('code', code)
      url.searchParams.set('next', '/reset-password')
      window.location.replace(url.toString())
      return
    }
  }, [code])

  useEffect(() => {
    if (code) return

    if (!(tokenHash && type === 'recovery')) {
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setReady(true)
          setExchanging(false)
          return
        }
        setExchanging(false)
        setError('Link tidak valid atau kadaluarsa. Silakan minta link reset password baru.')
      }
      checkSession()
      return
    }

    const verifyToken = async () => {
      setExchanging(true)
      setError('')
      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: 'recovery',
        })
        if (verifyError) {
          setError(verifyError.message === 'Token has expired or is invalid' ? 'Link sudah kadaluarsa. Silakan minta link reset password baru.' : verifyError.message)
        } else {
          setReady(true)
        }
      } catch {
        setError('Gagal memverifikasi link. Silakan coba lagi atau minta link baru.')
      } finally {
        setExchanging(false)
      }
    }

    verifyToken()
  }, [code, tokenHash, type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi tidak sama.')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
      setSuccess(true)
      await supabase.auth.signOut()
      setTimeout(() => {
        router.push('/login?message=' + encodeURIComponent('Password berhasil diubah. Silakan login dengan password baru.'))
      }, 1500)
    } catch {
      setError('Gagal mengubah password.')
    } finally {
      setLoading(false)
    }
  }

  if (code) {
    return (
      <div className="auth-page flex items-center justify-center">
        <div className="auth-card text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--muted))]">Mengalihkan...</p>
        </div>
      </div>
    )
  }

  if (exchanging) {
    return (
      <div className="auth-page flex items-center justify-center">
        <div className="auth-card text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--muted))]">Memverifikasi link...</p>
        </div>
      </div>
    )
  }

  if (!ready && error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-error mb-4">{error}</p>
          <p className="auth-footer">
            <Link href="/forgot-password">Minta link baru</Link>
            <span className="mx-2">·</span>
            <Link href="/login">Kembali ke login</Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center">
          <h1 className="auth-title">Password Diubah</h1>
          <p className="text-sm text-[rgb(var(--muted))] mb-4">Redirect ke halaman login...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
        </div>
      </div>
    )
  }

  if (!ready) return null

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Atur Password Baru</h1>
        <p className="text-sm text-center text-[rgb(var(--muted))] mb-4">
          Masukkan password baru minimal 6 karakter.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Password baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label>Konfirmasi password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button disabled={loading} className="auth-button">
            {loading ? 'Menyimpan...' : 'Simpan password'}
          </button>
        </form>

        <p className="auth-footer mt-4">
          <Link href="/login">Kembali ke login</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
