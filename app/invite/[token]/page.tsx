'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, Book, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function InvitePage() {
    const { token } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{ name: string; type: string; role: string; albumId: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)

    useEffect(() => {
        if (!token) return

        // Validate token
        fetch(`/api/albums/invite/${token}`)
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error)
                setData(result)
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [token])

    const handleJoin = async () => {
        // Check auth first
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push(`/auth/login?next=/invite/${token}`)
            return
        }

        setJoining(true)
        try {
            const res = await fetch(`/api/albums/invite/${token}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const result = await res.json()

            if (res.ok) {
                toast.success(`Berhasil bergabung ke ${data?.name}`)
                if (data?.type === 'yearbook') {
                    router.push(`/user/portal/album/yearbook/${result.albumId}`)
                } else {
                    router.push(`/user/portal/dashboard`)
                }
            } else {
                if (res.status === 401) {
                    router.push(`/auth/login?next=/invite/${token}`)
                    return
                }
                throw new Error(result.error || 'Gagal bergabung')
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setJoining(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

    if (error) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">Undangan Tidak Valid</h1>
            <p className="text-gray-400 text-center max-w-md">{error === 'Invite expired' ? 'Undangan ini sudah kadaluarsa.' : error === 'Invite not found or invalid' ? 'Link undangan tidak ditemukan.' : error}</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-black/50 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl">
                {data?.role === 'admin' ? (
                    <div className="w-20 h-20 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20 flex items-center justify-center mb-6">
                        <Shield className="w-10 h-10" />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-full bg-white/5 text-white border border-white/10 flex items-center justify-center mb-6">
                        <Book className="w-10 h-10" />
                    </div>
                )}

                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Undangan {data?.role === 'admin' ? 'Admin' : 'Anggota'}</h2>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6 leading-tight">{data?.name}</h1>

                <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                    Anda diundang untuk bergabung ke album ini sebagai <span className="text-white font-bold">{data?.role === 'admin' ? 'Co-Owner (Admin)' : 'Anggota'}</span>.
                </p>

                <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full py-3.5 rounded-xl bg-lime-600 text-white font-bold text-base hover:bg-lime-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-lime-900/20"
                >
                    {joining ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Memproses...
                        </>
                    ) : (
                        <>
                            Terima Undangan
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
