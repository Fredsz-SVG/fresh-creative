'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/lib/toast'
import { fetchWithAuth } from '../../lib/api-client'
import { asObject } from '@/components/yearbook/utils/response-narrowing'
import { AnimatedLoginPage } from '@/components/animated-characters-login-page'
import { onAuthChange, signInWithGoogle, signInWithPassword, signOut } from '@/lib/auth-client'

function LoginContent() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('login_email')
    const savedPassword = sessionStorage.getItem('login_password')
    if (savedEmail) setEmail(savedEmail)
    if (savedPassword) setPassword(savedPassword)
  }, [])

  useEffect(() => {
    sessionStorage.setItem('login_email', email)
  }, [email])

  useEffect(() => {
    sessionStorage.setItem('login_password', password)
  }, [password])
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [suspended, setSuspended] = useState(false)
  const [suspendedMessage, setSuspendedMessage] = useState('Akun Anda sedang disuspend. Silakan hubungi admin.')
  const [dismissedSuspended, setDismissedSuspended] = useState(false)
  const [popupState, setPopupState] = useState({ show: false, title: '', message: '' })
  const router = useRouter()
  const searchParams = useSearchParams()
  const suspendedFromQuery = searchParams.get('error') === 'account_suspended'
  const showSuspended = !dismissedSuspended && (suspended || suspendedFromQuery)

  useEffect(() => {
    const err = searchParams.get('error')
    const msg = searchParams.get('message')
    if (err) {
      const decoded = decodeURIComponent(err)
      if (decoded === 'account_suspended') {
        setPopupState({
          show: true,
          title: 'Account Suspended',
          message: 'Akun Anda sedang disuspend. Silakan hubungi admin.',
        })
        setError('')
        setMessage('')
      } else if (decoded.includes('Akun belum terdaftar')) {
        setPopupState({
          show: true,
          title: 'Akun Belum Terdaftar',
          message: decoded,
        })
        setError('')
      } else {
        setError(decoded)
      }
    }
    if (msg) setMessage(decodeURIComponent(msg))

    if (err || msg) {
      window.history.replaceState(null, '', '/login')
    }
  }, [searchParams])

  const nextPath = searchParams.get('next') ?? ''
  const isVerifiedQuery = searchParams.get('verified') === 'true'

  useEffect(() => {
    if (isVerifiedQuery) {
      setPopupState({
        show: true,
        title: 'Verifikasi Berhasil',
        message: 'Email Anda berhasil diverifikasi. Silakan login kembali.',
      })
      window.history.replaceState(null, '', '/login')
    }
  }, [isVerifiedQuery])

  const handleClosePopup = () => {
    setPopupState({ ...popupState, show: false })
  }

  useEffect(() => {
    let cancelled = false
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        if (!cancelled) setCheckingSession(false)
        return
      }

      if (!user.emailVerified) {
        await fetchWithAuth('/api/auth/logout')
        await signOut()
        if (!cancelled) {
          setPopupState({
            show: true,
            title: 'Email Belum Diverifikasi',
            message: 'Silakan cek kotak masuk email Anda (atau folder Spam) dan klik link verifikasi sebelum login.',
          })
          setCheckingSession(false)
        }
        return
      }

      try {
        const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
        const bootstrap = (await resBootstrap.json().catch(() => ({}))) as {
          me?: { isSuspended?: boolean; role?: 'admin' | 'user' }
          otp?: { verified?: boolean; suspended?: boolean }
        }

        if (resBootstrap.ok && bootstrap?.me?.isSuspended) {
          await fetchWithAuth('/api/auth/logout')
          await signOut()
          setSuspended(true)
          setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
          if (!cancelled) setCheckingSession(false)
          return
        }

        if (bootstrap?.otp?.suspended) {
          await fetchWithAuth('/api/auth/logout')
          await signOut()
          setSuspended(true)
          setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
          if (!cancelled) setCheckingSession(false)
          return
        }

        if (bootstrap?.otp?.verified) {
          const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''
          const role = bootstrap?.me?.role === 'admin' ? 'admin' : 'user'
          let finalNext = safeNext
          if (role === 'admin' && finalNext.startsWith('/user')) {
            finalNext = finalNext.replace('/user', '/admin')
          }
          router.replace(finalNext || (role === 'admin' ? '/admin' : '/user'))
          return
        }

        const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
        router.replace(`/auth/verify-otp${q}`)
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [router, nextPath])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const cred = await signInWithPassword(email, password)
      const user = cred.user

      if (!user) {
        setError('Login gagal. Silakan coba lagi.')
        return
      }

      if (!user.emailVerified) {
        await fetchWithAuth('/api/auth/logout')
        await signOut()
        setPopupState({
          show: true,
          title: 'Email Belum Diverifikasi',
          message: 'Silakan cek kotak masuk email Anda (atau folder Spam) dan klik link verifikasi sebelum login.',
        })
        setLoading(false)
        return
      }

      const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
      const bootstrap = asObject(await resBootstrap.json().catch(() => ({}))) as any
      if (bootstrap?.me?.isSuspended || bootstrap?.otp?.suspended) {
        await fetchWithAuth('/api/auth/logout')
        await signOut()
        setSuspended(true)
        setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
        setDismissedSuspended(false)
        return
      }

      if (bootstrap?.otp?.verified) {
        const role = bootstrap?.me?.role === 'admin' ? 'admin' : 'user'
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''
        let finalNext = safeNext
        if (role === 'admin' && finalNext.startsWith('/user')) {
          finalNext = finalNext.replace('/user', '/admin')
        }
        router.replace(finalNext || (role === 'admin' ? '/admin' : '/user'))
      } else {
        const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
        router.push(`/auth/verify-otp${q}`)
      }
    } catch {
      setError('Unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch {
      setError('Unexpected error occurred')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-white/10 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="auth-page">
      {showSuspended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full text-center">
            <h2 className="text-lg font-bold text-red-400 mb-2">Account Suspended</h2>
            <p className="text-xs text-gray-300 mb-4">
              {suspendedMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setSuspended(false)
                setDismissedSuspended(true)
              }}
              className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium text-gray-100 hover:bg-white/20 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {popupState.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full text-center">
            <h2 className="text-lg font-bold mb-2 text-red-400">
              {popupState.title}
            </h2>
            <p className="text-xs text-gray-300 mb-4">
              {popupState.message}
            </p>
            <button
              type="button"
              onClick={handleClosePopup}
              className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium text-gray-100 hover:bg-white/20 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      <AnimatedLoginPage
        email={email}
        password={password}
        showPassword={showPassword}
        isLoading={loading}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        onSubmit={handleLogin}
        onGoogleLogin={handleGoogleSignIn}
        googleLoading={googleLoading}
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}