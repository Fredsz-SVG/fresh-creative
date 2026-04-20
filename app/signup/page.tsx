'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/auth'
import { toast } from '@/lib/toast'
import { AnimatedSignupPage } from '@/components/animated-characters-login-page'

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams?.get('next') ?? ''

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        if (!session.user.email_confirmed_at && session.user.app_metadata?.provider === 'email') {
          await supabase.auth.signOut()
          return
        }
        const role = await getRole(supabase, session.user)
        router.replace(role === 'admin' ? '/admin' : '/user')
      }
    }
    redirectIfLoggedIn()
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
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'user', full_name: fullName },
          emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        toast.success('Registrasi berhasil! Silakan cek email untuk verifikasi.')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch {
      setError('Terjadi kesalahan saat registrasi')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = new URL(origin ? `${origin}/auth/callback` : window.location.href)
      url.searchParams.set('type', 'signup')
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
      setError('Terjadi kesalahan saat login dengan Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
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
      onGoogleLogin={handleGoogleSignUp}
      googleLoading={googleLoading}
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