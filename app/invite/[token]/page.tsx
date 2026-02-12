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
    const [inviteData, setInviteData] = useState<any>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        // Check current session
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)
        }
        checkSession()

        if (!token) return

        // Fetch invite details
        fetch(`/api/albums/invite/${token}`)
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error)
                setInviteData(result)
            })
            .catch(err => {
                setError(err.message)
            })
            .finally(() => setLoading(false))
    }, [token])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center text-white p-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Undangan Tidak Valid</h1>
                <p className="text-gray-400 text-center max-w-md mb-8">
                    {error === 'Invite expired'
                        ? 'Link undangan ini sudah kadaluarsa.'
                        : error === 'Invite not found or invalid'
                            ? 'Link undangan tidak ditemukan atau sudah tidak berlaku.'
                            : error}
                </p>
                <Link
                    href="/"
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors font-medium text-sm"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        )
    }

    if (!inviteData) return null

    const joinUrl = `/register/${inviteData.albumId}`

    return (
        <div className="min-h-screen bg-[#0a0a0b] relative overflow-hidden flex flex-col">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-[#0a0a0b] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-lime-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Navbar */}
            <header className="relative z-10 w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
                <Link href="/" className="font-bold text-xl tracking-wider text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center text-black font-black">F</div>
                    FRESHCREATIVE
                </Link>
                {!currentUser && (
                    <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        Masuk
                    </Link>
                )}
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left: Info */}
                    <div className="space-y-8 order-2 lg:order-1">
                        <div className="space-y-2">
                            <span className="inline-block px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold uppercase tracking-wider">
                                Invitation
                            </span>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                                Bergabung ke Album <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                                    {inviteData.name}
                                </span>
                            </h1>
                            <p className="text-gray-400 text-lg max-w-lg leading-relaxed">
                                {inviteData.description || 'Anda diundang untuk bergabung dalam album kenangan digital ini. Bergabunglah sekarang untuk melihat foto, video, dan kenangan indah bersama teman-teman.'}
                            </p>
                        </div>

                        <div className="space-y-4 pt-4">
                            {currentUser ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 w-fit">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {currentUser.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Masuk sebagai</p>
                                            <p className="font-medium text-white">{currentUser.email}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={joinUrl}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-lime-400 hover:bg-lime-500 text-black font-bold text-lg transition-all hover:scale-105 active:scale-95"
                                    >
                                        Lanjutkan Pendaftaran
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link
                                        href={`/login?next=${encodeURIComponent(joinUrl)}`}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold text-lg transition-all hover:bg-gray-100 hover:scale-105 active:scale-95"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        Masuk
                                    </Link>
                                    <Link
                                        href={`/signup?next=${encodeURIComponent(joinUrl)}`}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/10 transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        Daftar Akun
                                    </Link>
                                </div>
                            )}
                            <p className="text-xs text-justify text-gray-500 max-w-md pt-2">
                                Setelah masuk atau mendaftar, Anda akan diminta melengkapi data diri (Nama & Kelas) untuk bergabung ke album ini.
                            </p>
                        </div>
                    </div>

                    {/* Right: Preview Card */}
                    <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900 group">
                            {inviteData.coverImageUrl ? (
                                <img
                                    src={inviteData.coverImageUrl}
                                    alt={inviteData.name}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                                    <span className="text-6xl">🎓</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-8 flex flex-col justify-end">
                                <span className="text-lime-400 text-xs font-bold uppercase tracking-wider mb-2">Yearbook Album</span>
                                <h3 className="text-2xl font-bold text-white mb-2">{inviteData.name}</h3>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-lime-400" />
                                    <span>Invitation Valid</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}
