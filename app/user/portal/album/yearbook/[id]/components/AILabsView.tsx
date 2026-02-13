'use client'

import React from 'react'
import NextLink from 'next/link'
import { Video, Shirt, UserCircle, ImageIcon, Images } from 'lucide-react'
import TryOn from '@/components/fitur/TryOn'
import Pose from '@/components/fitur/Pose'
import ImageEditor from '@/components/fitur/ImageEditor'
import PhotoGroup from '@/components/fitur/PhotoGroup'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'
import { AI_LABS_FEATURES_USER } from '@/lib/dashboard-nav'

interface AILabsViewProps {
    album: any
    aiLabsTool: string | null
}

export default function AILabsView({ album, aiLabsTool }: AILabsViewProps) {
    const FEATURE_ICONS = [Shirt, UserCircle, ImageIcon, Images, Video] as const
    const albumBase = album?.id ? `/user/portal/album/yearbook/${album.id}` : ''

    if (aiLabsTool && albumBase) {
        const backUrl = albumBase

        // Helper to render tool with back link
        const renderTool = (Component: React.ComponentType) => (
            <div className="max-w-5xl mx-auto px-3 py-3 sm:p-4">
                <NextLink href={backUrl} className="inline-flex items-center gap-2 text-sm text-lime-400 hover:text-lime-300 mb-4">
                    ← Kembali ke daftar fitur
                </NextLink>
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
                    // If we have albumBase, construct URL with query param, otherwise fallback to feature href
                    const href = albumBase ? `${albumBase}?tool=${encodeURIComponent(toolSlug)}` : feature.href

                    return (
                        <NextLink
                            key={feature.href}
                            href={href}
                            className="
                flex flex-col items-center justify-center
                rounded-2xl border-2 border-white/10 bg-white/[0.04]
                p-5 sm:p-6 min-h-[140px] sm:min-h-[160px]
                hover:bg-white/[0.08] hover:border-lime-500/40 active:scale-[0.98]
                transition-all duration-200 touch-manipulation
                hover:shadow-[0_0_24px_rgba(132,204,22,0.12)]
              "
                        >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-lime-500/20 flex items-center justify-center mb-3 text-lime-400">
                                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <span className="text-sm sm:text-base font-bold text-white uppercase tracking-tight text-center">
                                {feature.label}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-500 text-center mt-1 line-clamp-2">
                                {feature.description}
                            </span>
                        </NextLink>
                    )
                })}
            </div>
        </div>
    )
}
