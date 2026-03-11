'use client'

import React, { useState } from 'react'
import NextLink from 'next/link'
import { Video, Shirt, UserCircle, ImageIcon, Images, Lock, Coins, Loader2, Zap, ChevronRight } from 'lucide-react'
import TryOn from '@/components/fitur/TryOn'
import Pose from '@/components/fitur/Pose'
import ImageEditor from '@/components/fitur/ImageEditor'
import PhotoGroup from '@/components/fitur/PhotoGroup'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'
import { AI_LABS_FEATURES_USER } from '@/lib/dashboard-nav'
import { toast } from 'sonner'
import { apiUrl } from '../../../lib/api-url'
import { fetchWithAuth } from '../../../lib/api-client'

// Map feature labels to feature_type slugs for unlocking
const FEATURE_SLUG_MAP: Record<string, string> = {
    'tryon': 'tryon',
    'pose': 'pose',
    'image-editor': 'image_remove_bg',
    'photogroup': 'photogroup',
    'phototovideo': 'phototovideo',
}

interface AILabsViewProps {
    album: any
    aiLabsTool: string | null
    aiLabsFeaturesByPackage?: string[]
    featureUnlocks?: string[]
    featureCreditCosts?: Record<string, number>
    onFeatureUnlocked?: () => void
}

export default function AILabsView({ album, aiLabsTool, aiLabsFeaturesByPackage = [], featureUnlocks = [], featureCreditCosts = {}, onFeatureUnlocked }: AILabsViewProps) {
    const pathname = require('next/navigation').usePathname()
    const isAdmin = pathname?.startsWith('/admin')
    const FEATURE_ICONS = [Shirt, UserCircle, ImageIcon, Images, Video] as const
    const albumBase = album?.id ? (isAdmin ? `/admin/album/yearbook/${album.id}` : `/user/album/yearbook/${album.id}`) : ''
    const [unlockingFeature, setUnlockingFeature] = useState<string | null>(null)

    const isFeatureUnlocked = (toolSlug: string) => {
        const featureType = FEATURE_SLUG_MAP[toolSlug] || toolSlug
        // If this specific feature is enabled by pricing package, it's accessible
        if (aiLabsFeaturesByPackage.includes(featureType)) return true
        // Otherwise check if individually unlocked via credits
        return featureUnlocks.includes(featureType)
    }

    const getFeatureCreditCost = (toolSlug: string) => {
        const featureType = FEATURE_SLUG_MAP[toolSlug] || toolSlug
        return featureCreditCosts[featureType] ?? 0
    }

    const handleUnlockFeature = async (toolSlug: string) => {
        if (!album?.id) return
        const featureType = FEATURE_SLUG_MAP[toolSlug] || toolSlug
        setUnlockingFeature(toolSlug)
        try {
            const res = await fetchWithAuth(`/api/albums/${album.id}/unlock-feature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature_type: featureType }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                toast.success(`Fitur berhasil dibuka! 🎉`)
                onFeatureUnlocked?.()
            } else if (res.status === 402) {
                toast.error(data.error || 'Credit tidak cukup. Silakan top up terlebih dahulu.')
            } else if (res.status === 409) {
                toast.info('Fitur sudah dibuka sebelumnya.')
                onFeatureUnlocked?.()
            } else {
                toast.error(data.error || 'Gagal membuka fitur.')
            }
        } catch (err) {
            toast.error('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setUnlockingFeature(null)
        }
    }

    if (aiLabsTool && albumBase) {
        // Check if tool is unlocked before rendering
        if (!isFeatureUnlocked(aiLabsTool)) {
            const creditCost = getFeatureCreditCost(aiLabsTool)
            return (
                <div className="flex flex-col items-center justify-center min-h-[40vh] p-4 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] sm:rounded-[28px] bg-amber-400 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a]">
                        <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-900" strokeWidth={3} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Fitur Terkunci</h2>
                    <p className="text-slate-400 font-bold text-[10px] sm:text-xs max-w-[280px] sm:max-w-sm mb-8 uppercase tracking-widest leading-relaxed">
                        Buka fitur ini dengan kredit untuk mulai menggunakannya di album ini.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a]">
                            <Zap className="w-4 h-4 text-amber-500" strokeWidth={3} />
                            <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{creditCost} CREDIT</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleUnlockFeature(aiLabsTool)}
                            disabled={unlockingFeature === aiLabsTool}
                            className="px-8 py-4 rounded-xl bg-indigo-500 text-white border-2 border-slate-900 font-black text-sm uppercase shadow-[6px_6px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2.5"
                        >
                            {unlockingFeature === aiLabsTool ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    MEMBUKA...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    BUKA SEKARANG
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )
        }

        // Helper to render tool
        const renderTool = (Component: React.ComponentType) => (
            <div className="max-w-5xl mx-auto px-3 py-3 sm:p-4">
                <Component />
            </div>
        )

        if (aiLabsTool === 'tryon') return renderTool(TryOn)
        if (aiLabsTool === 'pose') return renderTool(Pose)
        if (aiLabsTool === 'image-editor') return renderTool(ImageEditor)
        if (aiLabsTool === 'photogroup') return renderTool(PhotoGroup)
        if (aiLabsTool === 'phototovideo') return renderTool(PhotoToVideo)
    }

    const FEATURE_COLORS = [
        'bg-emerald-400',
        'bg-sky-400',
        'bg-amber-400',
        'bg-rose-400',
        'bg-indigo-400'
    ]

    return (
        <div className="max-w-6xl mx-auto px-4 py-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {AI_LABS_FEATURES_USER.map((feature, index) => {
                    const Icon = FEATURE_ICONS[index] ?? Video
                    const toolSlug = feature.href.replace(/\/$/, '').split('/').pop() ?? ''
                    const href = albumBase ? `${albumBase}?section=ai-labs&tool=${encodeURIComponent(toolSlug)}` : feature.href
                    const unlocked = isFeatureUnlocked(toolSlug)
                    const creditCost = getFeatureCreditCost(toolSlug)
                    const iconBg = FEATURE_COLORS[index % FEATURE_COLORS.length]

                    return (
                        <div
                            key={feature.href}
                            className="group relative bg-white rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex flex-col overflow-hidden"
                        >
                            <div className="p-5 flex flex-col h-full">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] transition-transform group-hover:scale-110 ${iconBg}`}>
                                    <Icon className="w-6 h-6 text-slate-900" strokeWidth={3} />
                                </div>

                                <div className="flex-1 min-h-[60px]">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight mb-1.5 line-clamp-1">{feature.label}</h3>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-4 leading-relaxed line-clamp-2">{feature.description}</p>
                                </div>

                                <div className="mt-auto pt-4 border-t-2 border-slate-50 flex items-center justify-between gap-3">
                                    {!unlocked ? (
                                        <button
                                            onClick={() => handleUnlockFeature(toolSlug)}
                                            disabled={unlockingFeature === toolSlug}
                                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[9px] font-black uppercase tracking-widest text-slate-900"
                                        >
                                            {unlockingFeature === toolSlug ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-3.5 h-3.5" />
                                                    {creditCost}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <NextLink
                                            href={href}
                                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-indigo-500 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[9px] font-black uppercase tracking-widest text-white px-2"
                                        >
                                            <span className="truncate">BUKA</span>
                                            <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />
                                        </NextLink>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
