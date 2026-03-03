'use client'

import React, { useState } from 'react'
import NextLink from 'next/link'
import { Video, Shirt, UserCircle, ImageIcon, Images, Lock, Coins, Loader2 } from 'lucide-react'
import TryOn from '@/components/fitur/TryOn'
import Pose from '@/components/fitur/Pose'
import ImageEditor from '@/components/fitur/ImageEditor'
import PhotoGroup from '@/components/fitur/PhotoGroup'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'
import { AI_LABS_FEATURES_USER } from '@/lib/dashboard-nav'
import { toast } from 'sonner'

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
            const res = await fetch(`/api/albums/${album.id}/unlock-feature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature_type: featureType }),
                credentials: 'include',
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
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                        <Lock className="w-10 h-10 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Fitur Terkunci</h2>
                    <p className="text-gray-400 text-sm max-w-sm mb-6">
                        Buka fitur ini dengan credit untuk mulai menggunakannya di album ini.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                            <Coins className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300">Biaya:</span>
                            <span className="font-bold text-purple-400">{creditCost} credit</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleUnlockFeature(aiLabsTool)}
                            disabled={unlockingFeature === aiLabsTool}
                            className="px-6 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-purple-900/30"
                        >
                            {unlockingFeature === aiLabsTool ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Membuka...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Buka Fitur
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

    return (
        <div className="max-w-5xl mx-auto px-3 py-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
                {AI_LABS_FEATURES_USER.map((feature, index) => {
                    const Icon = FEATURE_ICONS[index] ?? Video
                    const toolSlug = feature.href.replace(/\/$/, '').split('/').pop() ?? ''
                    const href = albumBase ? `${albumBase}?section=ai-labs&tool=${encodeURIComponent(toolSlug)}` : feature.href
                    const unlocked = isFeatureUnlocked(toolSlug)
                    const creditCost = getFeatureCreditCost(toolSlug)

                    return (
                        <div key={feature.href} className="relative">
                            <NextLink
                                href={href}
                                className={`
                flex flex-col items-center justify-center
                rounded-2xl border-2 ${unlocked ? 'border-white/10 bg-white/[0.04]' : 'border-white/5 bg-white/[0.02]'}
                p-5 sm:p-6 h-[220px] sm:h-[240px]
                hover:bg-white/[0.08] hover:border-lime-500/40 active:scale-[0.98]
                transition-all duration-200 touch-manipulation
                hover:shadow-[0_0_24px_rgba(132,204,22,0.12)]
              `}
                            >
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${unlocked ? 'bg-lime-500/20' : 'bg-gray-500/20'} flex items-center justify-center mb-3 shrink-0 ${unlocked ? 'text-lime-400' : 'text-gray-400'}`}>
                                    <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                                </div>
                                <span className="text-sm sm:text-base font-bold text-white uppercase tracking-tight text-center">
                                    {feature.label}
                                </span>
                                <span className="text-[10px] sm:text-xs text-gray-300 text-center mt-1 line-clamp-2">
                                    {feature.description}
                                </span>
                                {!unlocked ? (
                                    <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                                        <Lock className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">{creditCost} credit</span>
                                    </div>
                                ) : (
                                    <div className="mt-2 px-2 py-1 invisible">
                                        <span className="text-[10px]">&nbsp;</span>
                                    </div>
                                )}
                            </NextLink>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
