'use client'

import Link from 'next/link'
import { ChevronLeft, Layout, Eye, Menu } from 'lucide-react'
import BackLink from '@/components/dashboard/BackLink'
import CreditBadgeTop from './CreditBadgeTop'

interface YearbookHeaderProps {
    sectionTitle: string
    sectionSubtitle: string
    headerCount: number | null | undefined
    isAiLabsToolActive: boolean
    aiLabsBackHref: string
    effectiveBackHref: string
    effectiveBackLabel: string
    sidebarModeFromPath: string
    isOwner: boolean
    isAlbumAdmin: boolean
    isCoverView: boolean
    flipbookEnabledByPackage: boolean
    featureUnlocks: string[]
    flipbookPreviewMode: boolean
    setFlipbookPreviewMode: (v: boolean) => void
    mobileMenuOpen: boolean
    setMobileMenuOpen: (v: boolean) => void
}

export default function YearbookHeader({
    sectionTitle,
    sectionSubtitle,
    headerCount,
    isAiLabsToolActive,
    aiLabsBackHref,
    effectiveBackHref,
    effectiveBackLabel,
    sidebarModeFromPath,
    isOwner,
    isAlbumAdmin,
    isCoverView,
    flipbookEnabledByPackage,
    featureUnlocks,
    flipbookPreviewMode,
    setFlipbookPreviewMode,
    setMobileMenuOpen,
}: YearbookHeaderProps) {
    return (
        <div className="flex sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-3 lg:px-4 h-14 items-center gap-3 lg:gap-4 shadow-sm">
            {/* Mobile: compact back arrow */}
            <Link href={isAiLabsToolActive ? aiLabsBackHref : effectiveBackHref} className="lg:hidden inline-flex items-center justify-center p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors touch-manipulation">
                <ChevronLeft className="w-5 h-5" />
            </Link>
            {/* Desktop: full BackLink */}
            <div className="hidden lg:block">
                {isAiLabsToolActive ? (
                    <BackLink href={aiLabsBackHref} label="Ke Daftar Fitur" />
                ) : (
                    <BackLink href={effectiveBackHref} label={effectiveBackLabel} />
                )}
            </div>
            {sectionTitle && (
                <>
                    {/* Mobile: title left-aligned */}
                    <div className="lg:hidden flex-1 min-w-0">
                        <h1 className="text-base font-extrabold text-gray-800 truncate text-left">{sectionTitle}</h1>
                    </div>
                    {/* Desktop: title centered */}
                    <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-center min-w-0 max-w-[50%]">
                        <div className="flex items-center justify-center gap-2">
                            <h1 className="text-lg font-extrabold text-gray-800 truncate">{sectionTitle}</h1>
                            {headerCount !== null && headerCount !== undefined && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-xs font-bold text-violet-600 border border-violet-200">
                                    {headerCount}
                                </span>
                            )}
                        </div>
                        {sectionSubtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{sectionSubtitle}</p>}
                    </div>
                </>
            )}

            {/* AI Labs Credit Badge */}
            {isAiLabsToolActive && (
                <div className="ml-auto flex items-center pr-1 lg:pr-2">
                    <CreditBadgeTop />
                </div>
            )}

            {/* Flipbook Controls (Mobile & Desktop) */}
            {sidebarModeFromPath === 'flipbook' && (isOwner || isAlbumAdmin) && (flipbookEnabledByPackage || featureUnlocks.includes('flipbook')) && (
                <div className="ml-auto flex bg-gray-100 p-1 rounded-xl border border-gray-200 gap-1 items-center scale-90 lg:scale-100 origin-right">
                    <button
                        onClick={() => setFlipbookPreviewMode(false)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!flipbookPreviewMode ? 'bg-violet-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                    >
                        <Layout className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editor</span>
                    </button>
                    <button
                        onClick={() => setFlipbookPreviewMode(true)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${flipbookPreviewMode ? 'bg-violet-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                    >
                        <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span>
                    </button>
                </div>
            )}

            {/* Class Menu Button (Mobile) */}
            {sidebarModeFromPath === 'classes' && !isCoverView && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setMobileMenuOpen(true)
                    }}
                    className="lg:hidden ml-auto flex items-center justify-center w-10 h-10 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all active:scale-95 flex-shrink-0 shadow-sm"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </div>
    )
}
