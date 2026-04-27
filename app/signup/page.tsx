'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { AnimatedSignupPage } from '@/components/animated-characters-login-page'
import { onAuthChange, signUpWithPassword } from '@/lib/auth-client'
import { fetchWithAuth } from '@/lib/api-client'

function SignUpContent() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        if (!cancelled) setCheckingSession(false)
        return
      }
      try {
        const resBootstrap = await fetchWithAuth('/api/user/bootstrap')
        const bootstrap = (await resBootstrap.json().catch(() => ({}))) as {
          me?: { role?: 'admin' | 'user' }
          otp?: { verified?: boolean }
        }
        const role = bootstrap?.me?.role === 'admin' ? 'admin' : 'user'
        if (!bootstrap?.otp?.verified) {
          router.replace('/auth/verify-otp')
          return
        }
        router.replace(role === 'admin' ? '/admin' : '/user')
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak sama')
      setLoading(false)
      return
    }

    try {
      await signUpWithPassword({ email, password, fullName })
      toast.success('Registrasi berhasil! Silakan cek email untuk verifikasi (jika diaktifkan), lalu login.')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
    } catch {
      setError('Terjadi kesalahan saat registrasi')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-white/10 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AnimatedSignupPage
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      showPassword={showPassword}
      isLoading={loading}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onTogglePassword={handleTogglePassword}
      onSubmit={handleSignUp}
    />
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpContent />
    </Suspense>
  )
}