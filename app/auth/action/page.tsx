'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyActionCode, checkActionCode } from 'firebase/auth'
import { getFirebaseClient } from '@/lib/firebase'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function AuthActionContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const mode = searchParams.get('mode')
    const oobCode = searchParams.get('oobCode')
    const apiKey = searchParams.get('apiKey')
    const continueUrl = searchParams.get('continueUrl')

    // SMART ROUTING UNTUK DEV & PROD
    // Jika kita sedang di production, tapi request aslinya dari localhost (dev)
    if (
      typeof window !== 'undefined' && 
      !window.location.origin.includes('localhost') && 
      continueUrl?.startsWith('http://localhost')
    ) {
      try {
        const continueOrigin = new URL(continueUrl).origin
        // Redirect ke localhost agar dev experience tetap mulus
        window.location.href = `${continueOrigin}/auth/action?mode=${mode}&oobCode=${oobCode}&apiKey=${apiKey}`
        return
      } catch (e) {
        // ignore if not valid URL
      }
    }

    if (!mode || !oobCode) {
      setStatus('error')
      setErrorMessage('Link tidak valid atau telah kadaluarsa.')
      return
    }

    const { auth } = getFirebaseClient()

    const handleAction = async () => {
      try {
        if (mode === 'verifyEmail') {
          // Verifikasi email
          await applyActionCode(auth, oobCode)
          setStatus('success')
        } else if (mode === 'resetPassword') {
          // Jika nanti ingin menghandle reset password di halaman yang sama
          // Arahkan ke halaman reset password kustom yang sudah ada
          router.push(`/reset-password?oobCode=${oobCode}`)
        } else {
          setStatus('error')
          setErrorMessage('Aksi tidak dikenali.')
        }
      } catch (error: any) {
        setStatus('error')
        // Menangani error umum Firebase
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('Link sudah pernah digunakan atau kadaluarsa. Silakan request ulang.')
        } else {
          setErrorMessage('Terjadi kesalahan saat memverifikasi. Coba lagi nanti.')
        }
      }
    }

    handleAction()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 p-8 relative overflow-hidden">
        
        {/* Dekorasi Background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-2">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Memverifikasi Email...
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Mohon tunggu sebentar, kami sedang memproses permintaan Anda.
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Verifikasi Berhasil!
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Email Anda telah berhasil diverifikasi. Anda sekarang dapat masuk ke akun Anda.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-white transition-colors bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Lanjut ke Halaman Login
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Verifikasi Gagal
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {errorMessage}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-white transition-colors bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Kembali ke Halaman Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <AuthActionContent />
    </Suspense>
  )
}
