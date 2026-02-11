'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'

/**
 * Student Invite Page
 * Admin/member invites are now handled directly via email (deprecated invite system)
 * This page only handles student registration invites
 */
export default function InvitePage() {
    const { token } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        // Validate token and redirect to registration
        fetch(`/api/albums/invite/${token}`)
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error)
                
                // Student invite - redirect to registration page
                if (result.inviteType === 'student' && result.albumId) {
                    router.push(`/register/${result.albumId}`)
                } else {
                    throw new Error('Invalid invite type')
                }
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [token, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold mb-2">Undangan Tidak Valid</h1>
                <p className="text-gray-400 text-center max-w-md">
                    {error === 'Invite expired' 
                        ? 'Undangan ini sudah kadaluarsa.' 
                        : error === 'Invite not found or invalid' 
                        ? 'Link undangan tidak ditemukan.' 
                        : error}
                </p>
            </div>
        )
    }

    return null
}
