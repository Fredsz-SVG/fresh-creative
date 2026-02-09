'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const OTP_COOLDOWN_KEY = 'otp_cooldown_by_email'
/** Debounce: jangan kirim OTP otomatis lagi ke email yang sama dalam jangka waktu ini (Strict Mode / remount) */
const INITIAL_SEND_DEBOUNCE_MS = 15_000
/** Hanya satu pengiriman OTP per email dalam satu waktu (enterprise: no double-send) */
const sendInProgressByEmail: Record<string, boolean> = {}
const lastInitialSendAtByEmail: Record<string, number> = {}

function getCooldownRemaining(email: string): number {
  if (typeof window === 'undefined' || !email) return 0
  try {
    const raw = window.localStorage.getItem(OTP_COOLDOWN_KEY)
    const data = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const end = data[email]
    if (!end) return 0
    const remaining = Math.ceil((end - Date.now()) / 1000)
    if (remaining <= 0) {
      delete data[email]
      window.localStorage.setItem(OTP_COOLDOWN_KEY, JSON.stringify(data))
      return 0
    }
    return remaining
  } catch {
    return 0
  }
}

function setCooldownStorage(seconds: number, email: string) {
  if (typeof window === 'undefined' || !email) return
  try {
    const raw = window.localStorage.getItem(OTP_COOLDOWN_KEY)
    const data = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    data[email] = Date.now() + seconds * 1000
    window.localStorage.setItem(OTP_COOLDOWN_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function clearCooldownStorage(email: string) {
  if (typeof window === 'undefined' || !email) return
  try {
    const raw = window.localStorage.getItem(OTP_COOLDOWN_KEY)
    const data = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    delete data[email]
    window.localStorage.setItem(OTP_COOLDOWN_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function formatCooldown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function VerifyOtpPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [backLoading, setBackLoading] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const emailRef = useRef('')
  const mountedRef = useRef(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? ''

  useEffect(() => {
    emailRef.current = email
  }, [email])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Cooldown real-time; per-email agar ganti akun (Google lain) tetap dikirim OTP
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearCooldownStorage(emailRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownSeconds])

  // Satu efek: cek session → cek otp-status → kirim OTP sekali (dengan lock + AbortController)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/login')
        return
      }
      const res = await fetch('/api/auth/otp-status', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (data.verified) {
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''
        const { getRole } = await import('@/lib/auth')
        const role = await getRole(supabase, session.user)
        router.replace(safeNext || (role === 'admin' ? '/admin' : '/user'))
        return
      }
      const userEmail = session.user.email ?? ''
      if (mountedRef.current) {
        setEmail(userEmail)
        setChecking(false)
      }
      const savedCooldown = getCooldownRemaining(userEmail)
      if (savedCooldown > 0) {
        if (mountedRef.current) {
          setCooldownSeconds(savedCooldown)
          setSendLoading(false)
        }
        return
      }

      // Enterprise: hanya satu pengiriman per email dalam satu waktu (hindari double-send)
      if (sendInProgressByEmail[userEmail]) return
      const now = Date.now()
      if (lastInitialSendAtByEmail[userEmail] != null && now - lastInitialSendAtByEmail[userEmail] < INITIAL_SEND_DEBOUNCE_MS) {
        if (mountedRef.current) setSendLoading(false)
        return
      }
      sendInProgressByEmail[userEmail] = true
      lastInitialSendAtByEmail[userEmail] = now
      if (mountedRef.current) setSendLoading(true)

      try {
        const sendRes = await fetch('/api/auth/send-login-otp', {
          method: 'POST',
          credentials: 'include',
          signal,
        })
        const sendData = await sendRes.json().catch(() => ({}))
        if (!sendRes.ok) {
          delete lastInitialSendAtByEmail[userEmail]
          const msg = typeof sendData?.error === 'string' ? sendData.error : 'Gagal mengirim OTP'
          const status429 = sendRes.status === 429
          const isRateLimit = /rate limit|already sent|60|wait|429|too many requests/i.test(msg)
          const isEmailQuota = status429 || /email|2\s*\/\s*h|per hour|per jam/i.test(msg)
          if (mountedRef.current) {
            if (isEmailQuota || status429) {
              const sec = 60 * 60
              setCooldownStorage(sec, userEmail)
              setCooldownSeconds(sec)
            } else if (isRateLimit) {
              const sec = 60
              setCooldownStorage(sec, userEmail)
              setCooldownSeconds(sec)
            } else {
              setError(msg)
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          delete sendInProgressByEmail[userEmail]
          delete lastInitialSendAtByEmail[userEmail]
          return
        }
        if (mountedRef.current) setError('Gagal mengirim OTP')
        delete lastInitialSendAtByEmail[userEmail]
      } finally {
        delete sendInProgressByEmail[userEmail]
        if (mountedRef.current) setSendLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [router, nextPath])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, next: nextPath || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Kode OTP tidak valid')
        setLoading(false)
        return
      }
      router.refresh()
      router.push(data.redirectTo || '/user')
    } catch {
      setError('Terjadi kesalahan')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = async () => {
    setBackLoading(true)
    try {
      await fetch('/api/auth/logout', { credentials: 'include' })
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    } finally {
      setBackLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setSendLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'Gagal mengirim ulang OTP'
        const status429 = res.status === 429
        const isRateLimit = /rate limit|already sent|60|wait|429|too many requests/i.test(msg)
        const isEmailQuota = status429 || /email|2\s*\/\s*h|per hour|per jam/i.test(msg)
        if (isEmailQuota || status429) {
          const sec = 60 * 60
          setCooldownStorage(sec, email)
          setCooldownSeconds(sec)
        } else if (isRateLimit) {
          const sec = 60
          setCooldownStorage(sec, email)
          setCooldownSeconds(sec)
        } else {
          setError(msg)
        }
      } else {
        setError('')
      }
    } finally {
      setSendLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="auth-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Verifikasi OTP</h1>
        <p className="text-sm text-center text-[rgb(var(--muted))] mb-4">
          {!error && <>Kode OTP telah dikirim ke <strong>{email}</strong>. </>}
          Masukkan kode 6 digit di bawah untuk masuk ke dashboard.
        </p>

        <form onSubmit={handleVerify} className="auth-form">
          <div className="auth-field">
            <label>Kode OTP (6 digit)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center tracking-[0.5em] text-lg"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button disabled={loading} className="auth-button">
            {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
          </button>

          <p className="text-center text-sm text-[rgb(var(--muted))]">
            Tidak menerima kode?{' '}
            <button
              type="button"
              disabled={sendLoading || cooldownSeconds > 0}
              onClick={handleResend}
              className="text-blue-500 hover:text-blue-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendLoading ? 'Mengirim...' : cooldownSeconds > 0 ? `Kirim ulang (${formatCooldown(cooldownSeconds)})` : 'Kirim ulang'}
            </button>
            {cooldownSeconds > 0 && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => {
                    clearCooldownStorage(email)
                    window.location.reload()
                  }}
                  className="text-blue-500 hover:text-blue-400 font-medium"
                >
                  Hapus cooldown &amp; kirim lagi
                </button>
              </>
            )}
          </p>
        </form>

        <p className="auth-footer mt-4 text-center">
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={backLoading}
            className="text-blue-500 hover:text-blue-400 font-medium disabled:opacity-50"
          >
            {backLoading ? 'Keluar...' : 'Kembali ke login'}
          </button>
        </p>
      </div>
    </div>
  )
}
