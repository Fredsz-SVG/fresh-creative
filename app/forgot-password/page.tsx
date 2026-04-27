'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from '@/lib/auth-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await requestPasswordReset(email)
      setMessage('Link reset password telah dikirim ke email Anda.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim link reset password.')
    }

    setLoading(false)
  }

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
            <h2 className="text-4xl font-black mb-4">Lupa Password?</h2>
            <p className="text-xl text-white/80">Kami bantu Anda reset password dengan mudah.</p>
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
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Lupa Password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Masukkan email untuk reset password</p>
          </div>

          <form onSubmit={handleReset} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="p-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="p-2 text-xs text-green-400 bg-green-950/20 border border-green-900/30 rounded-lg">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            <Link href="/login" className="text-sky-500 dark:text-sky-400 font-bold hover:underline">
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