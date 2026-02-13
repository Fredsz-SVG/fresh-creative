'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, Loader2, ArrowRight, CheckCircle2, User, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function InvitePage() {
    const { token } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        // Fetch invite details to get the albumId
        fetch(`/api/albums/invite/${token}`)
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error)
                // Redirect immediately to the beautiful registration page
                router.replace(`/register/${result.albumId}`)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [token, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center text-white">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-lime-500/20 border-t-lime-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lime-500">F</div>
                </div>
                <p className="mt-6 text-gray-400 font-medium animate-pulse">Menghubungkan ke Album...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Undangan Tidak Valid</h1>
                <p className="text-gray-400 max-w-md mb-10 leading-relaxed">
                    {error === 'Invite expired'
                        ? 'Maaf, link undangan ini sudah kadaluarsa. Silakan minta link baru kepada admin.'
                        : 'Maaf, link undangan tidak ditemukan atau sudah tidak berlaku.'}
                </p>
                <Link
                    href="/"
                    className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-sm"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        )
    }

    return null
}
