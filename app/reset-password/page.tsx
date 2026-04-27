'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(!!(code || (tokenHash && type === 'recovery')))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  if (code || exchanging) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 -m-4 lg:m-0">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-12 text-white min-h-screen">
          <div className="relative z-20">
            <div className="flex items-center gap-3">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-10 h-10 object-contain" />
              <span className="text-xl font-black tracking-tight">FRESHCREATIVE.ID</span>
            </div>
          </div>

          <div className="relative z-20 flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <h2 className="text-2xl font-bold">{code ? 'Mengalihkan...' : 'Memverifikasi link...'}</h2>
            </div>
          </div>

          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 size-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-950">
          <div className="w-full max-w-[380px]">
            <div className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-4 pl-2">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-7 h-7 object-contain" />
            </div>

            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {code ? 'Mengalihkan...' : 'Memverifikasi...'}
              </h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!ready && error) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 -m-4 lg:m-0">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-12 text-white min-h-screen">
          <div className="relative z-20">
            <div className="flex items-center gap-3">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-10 h-10 object-contain" />
              <span className="text-xl font-black tracking-tight">FRESHCREATIVE.ID</span>
            </div>
          </div>

          <div className="relative z-20 flex items-center justify-center flex-1">
            <div className="text-center">
              <h2 className="text-4xl font-black mb-4">Oops!</h2>
              <p className="text-xl text-white/80">Terjadi kesalahan saat verifikasi.</p>
            </div>
          </div>

          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 size-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-950">
          <div className="w-full max-w-[380px]">
            <div className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-4 pl-2">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-7 h-7 object-contain" />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reset Password</h1>
            </div>

            <div className="p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg mb-4">
              {error}
            </div>

            <div className="flex gap-2">
              <Link href="/forgot-password" className="flex-1">
                <Button variant="outline" className="w-full h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                  Minta Link Baru
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button className="w-full h-10 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white">
                  Kembali
                </Button>
              </Link>
            </div>

            <div className="lg:hidden text-center text-[10px] text-slate-400 dark:text-slate-500 mt-8 mb-1">
              Powered by <span className="font-black tracking-tight">FRESHCREATIVE.ID</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 -m-4 lg:m-0">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-12 text-white min-h-screen">
          <div className="relative z-20">
            <div className="flex items-center gap-3">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-10 h-10 object-contain" />
              <span className="text-xl font-black tracking-tight">FRESHCREATIVE.ID</span>
            </div>
          </div>

          <div className="relative z-20 flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Berhasil!</h2>
              <p className="text-white/80 mt-2">Redirect ke login...</p>
            </div>
          </div>

          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 size-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-950">
          <div className="w-full max-w-[380px]">
            <div className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-4 pl-2">
              <img src="/img/logo.png" alt="FreshCreative.ID" className="w-7 h-7 object-contain" />
            </div>

            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Password Diubah
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Redirect ke login...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!ready) return null

  return (
    <div className="min-h-screen grid lg:grid-cols-2 -m-4 lg:m-0">
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-12 text-white min-h-screen">
        <div className="relative z-20">
          <div className="flex items-center gap-3">
            <img src="/img/logo.png" alt="FreshCreative.ID" className="w-10 h-10 object-contain" />
            <span className="text-xl font-black tracking-tight">FRESHCREATIVE.ID</span>
          </div>
        </div>

        <div className="relative z-20 flex items-center justify-center flex-1">
          <div className="text-center">
            <h2 className="text-4xl font-black mb-4">Atur Password Baru</h2>
            <p className="text-xl text-white/80">Password baru minimal 6 karakter.</p>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
          &nbsp;
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden flex items-center gap-2 text-lg font-semibold mb-4 pl-2">
            <img src="/img/logo.png" alt="FreshCreative.ID" className="w-7 h-7 object-contain" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Atur Password Baru</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Password minimal 6 karakter</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">Password Baru</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-10 text-sm pr-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700 dark:text-slate-300">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="p-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <Link href="/login" className="text-sky-500 dark:text-sky-400 font-bold hover:underline text-xs">
              ← Kembali ke Login
            </Link>
          </div>

          <div className="lg:hidden text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3 mb-1">
            Powered by <span className="font-black tracking-tight">FRESHCREATIVE.ID</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}