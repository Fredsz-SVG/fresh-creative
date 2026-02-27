'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    // Bersihkan URL bar setelah parameter diproses agar saat direfresh tidak muncul lagi
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
    const redirectIfLoggedIn = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return
      }

      // Cek apakah email sudah diverifikasi (kecuali jika login dengan provider OAuth yang otomatis terverifikasi)
      if (!session.user.email_confirmed_at && session.user.app_metadata?.provider === 'email') {
        await supabase.auth.signOut()
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_suspended')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profileError && profile?.is_suspended) {
        await fetch('/api/auth/logout', { credentials: 'include' })
        await supabase.auth.signOut()
        setSuspended(true)
        setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
        return
      }
      const res = await fetch('/api/auth/otp-status', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (data.verified) {
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''
        const role = await getRole(supabase, session.user)
        router.replace(safeNext || (role === 'admin' ? '/admin' : '/user'))
        return
      }
      const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
      router.replace(`/auth/verify-otp${q}`)
    }
    redirectIfLoggedIn()
    return () => {
      cancelled = true
    }
  }, [router, nextPath])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setPopupState({
            show: true,
            title: 'Verifikasi Email',
            message: 'Silakan verifikasi email Anda terlebih dahulu dengan mengklik link yang dikirim ke email Anda.',
          })
          setError('')
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        if (!data.user.email_confirmed_at && data.user.app_metadata?.provider === 'email') {
          await supabase.auth.signOut()
          setPopupState({
            show: true,
            title: 'Verifikasi Email',
            message: 'Silakan verifikasi email Anda terlebih dahulu dengan mengklik link yang dikirim ke email Anda.',
          })
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('is_suspended')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profileError && profile?.is_suspended) {
          await supabase.auth.signOut()
          setSuspended(true)
          setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
          setDismissedSuspended(false)
          return
        }

        const statusRes = await fetch('/api/auth/otp-status', { credentials: 'include' })
        const statusData = await statusRes.json().catch(() => ({}))
        if (statusData.suspended) {
          await supabase.auth.signOut()
          setSuspended(true)
          setSuspendedMessage('Akun Anda sedang disuspend. Silakan hubungi admin.')
          setDismissedSuspended(false)
          return
        }
        if (statusData.verified) {
          const role = await getRole(supabase, data.user)
          const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''
          router.replace(safeNext || (role === 'admin' ? '/admin' : '/user'))
        } else {
          router.push('/auth/verify-otp')
        }
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
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = new URL(origin ? `${origin}/auth/callback` : window.location.href)
      url.searchParams.set('type', 'login')
      if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
        url.searchParams.set('next', nextPath)
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: url.toString(),
          queryParams: { prompt: 'select_account' },
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError('Unexpected error occurred')
    } finally {
      setGoogleLoading(false)
    }
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
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="auth-forgot">
            <Link href="/forgot-password" className="auth-footer">
              Forgot password?
            </Link>
          </div>

          {message && <p className="text-sm text-green-600 dark:text-green-400 mb-3">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button disabled={loading} className="auth-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="auth-divider">atau lanjut dengan</div>
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
            className="auth-google-button"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? 'Membuka Google...' : 'Login dengan Google'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
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
