'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
    motion,
    useMotionValue,
    useTransform,
    useAnimation,
    AnimatePresence,
    PanInfo,
} from 'framer-motion'
import { BookOpen, MessageSquare, Users, Play, X, Instagram, Cake, Mail } from 'lucide-react'
import FastImage from '@/components/ui/FastImage'

function stripQuotes(s: string): string {
    return s.replace(/^["""\u201C\u201D]+/, '').replace(/["""\u201C\u201D]+$/, '').trim()
}

type Teacher = {
    id: string
    name: string
    title?: string
    message?: string
    photo_url?: string
    video_url?: string
    sort_order?: number
    photos?: { id: string; file_url: string; sort_order: number }[]
}

type ClassMember = {
    user_id: string
    student_name: string
    email: string | null
    date_of_birth: string | null
    instagram: string | null
    message: string | null
    video_url: string | null
    photos?: string[]
    is_me?: boolean
}

type AlbumClass = {
    id: string
    name: string
    sort_order?: number
    student_count?: number
    batch_photo_url?: string | null
}

interface PreviewViewProps {
    album: any
    classes: AlbumClass[]
    teachers: Teacher[]
    membersByClass: Record<string, ClassMember[]>
    firstPhotoByStudent: Record<string, string>
    onPlayVideo?: (url: string) => void
    onClose: () => void
    hideCloseButton?: boolean
}

type Section = {
    type: 'cover' | 'sambutan' | 'class'
    label: string
    icon: React.ReactNode
    classId?: string
    classIndex?: number
}

type CardItem = {
    id: string
    imageUrl?: string | null
    title: string
    subtitle?: string
    badges?: { label: string; color?: string }[]
    description?: string
    videoUrl?: string | null
    meta?: { icon: React.ReactNode; text: string }[]
}

// ─── Framer-motion Tinder Card (swiparr FrameTinderCard pattern) ───
interface TinderCardProps {
    children: React.ReactNode
    onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
    onCardLeftScreen?: (direction: 'left' | 'right' | 'up' | 'down') => void
    onDragStart?: () => void
    onDrag?: (offset: { x: number; y: number }) => void
    onDragEnd?: () => void
    onFlyOffStart?: (direction: 'left' | 'right' | 'up') => void
    index: number  // 0 = front, 1+ = behind
    preventSwipe?: ('left' | 'right' | 'up' | 'down')[]
}

function TinderCard({ children, onSwipe, onCardLeftScreen, onDragStart, onDrag, onDragEnd, onFlyOffStart, index, preventSwipe = [] }: TinderCardProps) {
    const controls = useAnimation()
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const isAnimating = useRef(false)
    const isFront = index === 0

    // Rotation & opacity transforms (swiparr FrameTinderCard)
    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-200, -170, 0, 170, 200], [0, 1, 1, 1, 0])

    // Reset motion values when this card becomes the front card
    const prevIndexRef = useRef(index)
    useEffect(() => {
        if (prevIndexRef.current !== 0 && index === 0) {
            controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 })
        }
        prevIndexRef.current = index
    }, [index, controls])

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        if (isAnimating.current) return

        const offsetX = info.offset.x
        const offsetY = info.offset.y
        const velocityX = info.velocity.x
        const velocityY = info.velocity.y
        const absX = Math.abs(offsetX)
        const absY = Math.abs(offsetY)

        let direction: 'left' | 'right' | 'up' | 'down' | null = null

        if (absX > absY) {
            const dirX = offsetX < 0 ? 'left' : 'right'
            if ((absX > 100 || Math.abs(velocityX) > 500) && !preventSwipe.includes(dirX)) {
                direction = dirX
            }
        } else {
            const dirY = offsetY < 0 ? 'up' : 'down'
            if ((absY > 100 || Math.abs(velocityY) > 500) && !preventSwipe.includes(dirY)) {
                direction = dirY
            }
        }

        if (direction) {
            // For 'down' (go back): don't fly off, snap back and notify parent immediately
            if (direction === 'down') {
                onSwipe?.(direction)
                controls.start({
                    x: 0,
                    y: 0,
                    rotate: 0,
                    transition: { type: 'spring', stiffness: 300, damping: 25 },
                })
                return
            }

            isAnimating.current = true
            onSwipe?.(direction)
            onFlyOffStart?.(direction)

            const flyVal = 300
            let targetX = 0, targetY = 0, targetRotate = 0

            switch (direction) {
                case 'left': targetX = -flyVal; targetRotate = -20; break
                case 'right': targetX = flyVal; targetRotate = 20; break
                case 'up': targetY = -flyVal; break
            }

            if (direction === 'left' || direction === 'right') {
                targetY = y.get() + (velocityY * 2)
            }

            await controls.start({
                x: targetX,
                y: targetY,
                rotate: targetRotate,
                opacity: 0,
                transition: { duration: 0.25, ease: 'easeOut' },
            })

            onCardLeftScreen?.(direction)
            isAnimating.current = false
        } else {
            // Snap back (swiparr spring)
            controls.start({
                x: 0,
                y: 0,
                rotate: 0,
                transition: { type: 'spring', stiffness: 300, damping: 25 },
            })
        }
    }

    return (
        <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 3 - index }}
        >
            <motion.div
                className={`absolute w-full h-full rounded-2xl ${isFront ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : ''}`}
                style={{ x, y, rotate, opacity }}
                animate={controls}
                drag={isFront}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragStart={isFront ? () => onDragStart?.() : undefined}
                onDrag={isFront ? (_: unknown, info: PanInfo) => onDrag?.({ x: info.offset.x, y: info.offset.y }) : undefined}
                onDragEnd={isFront ? (e: unknown, info: PanInfo) => { handleDragEnd(e, info); onDragEnd?.() } : undefined}
                whileTap={isFront ? { cursor: 'grabbing' } : undefined}
            >
                <motion.div
                    className="w-full h-full rounded-2xl"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: isFront ? 1 : 0.95, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                >
                    {children}
                </motion.div>
            </motion.div>
        </div>
    )
}

// ─── Main PreviewView ───
export default function PreviewView({
    album,
    classes,
    teachers,
    membersByClass,
    firstPhotoByStudent,
    onPlayVideo,
    onClose,
    hideCloseButton,
}: PreviewViewProps) {
    const warmedImageUrlsRef = useRef<Set<string>>(new Set())
    const sections: Section[] = useMemo(() => [
        { type: 'cover', label: 'Cover', icon: <BookOpen className="w-4 h-4" /> },
        ...(teachers.length > 0 ? [{ type: 'sambutan' as const, label: 'Sambutan', icon: <MessageSquare className="w-4 h-4" /> }] : []),
        ...classes.map((c, i) => ({
            type: 'class' as const,
            label: c.name,
            icon: <Users className="w-4 h-4" />,
            classId: c.id,
            classIndex: i,
        })),
    ], [teachers.length, classes])

    const [sectionIndex, setSectionIndex] = useState(0)
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
    // Track direction for section transition animation
    const [sectionDirection, setSectionDirection] = useState(0) // -1 = left, 1 = right
    const [isTransitioning, setIsTransitioning] = useState(false)
    const sectionTransitioning = useRef(false)
    const [videoPopupUrl, setVideoPopupUrl] = useState<string | null>(null)
    // Deck belakang hanya kelihatan saat swipe naik/turun (satu tab), tidak saat swipe kiri/kanan (pindah tab)
    const [showDeckBehind, setShowDeckBehind] = useState(false)
    // Kartu yang sedang terbang (swipe off) taruh di belakang agar tidak menimpa kartu baru
    const [exitingCardId, setExitingCardId] = useState<string | null>(null)
    // Arah fly-off: hanya swipe UP yang boleh tampilkan deck belakang (bukan kiri/kanan)
    const [exitingDirection, setExitingDirection] = useState<'left' | 'right' | 'up' | null>(null)

    const currentSection = sections[sectionIndex] || sections[0]

    // Build all cards for current section
    const allCards: CardItem[] = useMemo(() => {
        if (currentSection.type === 'cover') {
            return [{
                id: 'cover',
                imageUrl: album?.cover_image_url,
                title: album?.name || 'Album',
                subtitle: album?.description || '',
                videoUrl: album?.cover_video_url,
            }]
        }
        if (currentSection.type === 'sambutan') {
            return teachers.map(t => ({
                id: t.id,
                imageUrl: t.photo_url || t.photos?.[0]?.file_url || null,
                title: t.name,
                subtitle: t.title || '',
                description: t.message ? stripQuotes(t.message) : undefined,
                videoUrl: t.video_url,
            }))
        }
        if (currentSection.type === 'class' && currentSection.classId) {
            const classObj = classes[currentSection.classIndex!]
            const members = membersByClass[currentSection.classId] || []
            const classCover: CardItem = {
                id: `class-cover-${currentSection.classId}`,
                imageUrl: classObj?.batch_photo_url || null,
                title: classObj?.name || 'Kelas',
                subtitle: `${members.length} Anggota`,
            }
            const memberCards: CardItem[] = members.map(m => ({
                id: `${currentSection.classId}-${m.user_id}`,
                imageUrl: m.photos?.[0] || firstPhotoByStudent?.[m.student_name] || null,
                title: m.student_name,
                subtitle: classObj?.name || '',
                videoUrl: m.video_url,
                description: m.message ? stripQuotes(m.message) : undefined,
                meta: [
                    ...(m.date_of_birth ? [{ icon: <Cake className="w-3.5 h-3.5" />, text: m.date_of_birth }] : []),
                    ...(m.instagram ? [{ icon: <Instagram className="w-3.5 h-3.5" />, text: m.instagram }] : []),
                ],
            }))
            return [classCover, ...memberCards]
        }
        return []
    }, [currentSection, album, teachers, classes, membersByClass, firstPhotoByStudent])

    // Active deck = cards not yet swiped away
    const activeDeck = useMemo(() =>
        allCards.filter(c => !removedIds.has(c.id)),
        [allCards, removedIds]
    )

    // Warm cache for current section images to avoid white blank delay.
    useEffect(() => {
        const urls = allCards
            .map((c) => c.imageUrl)
            .filter((u): u is string => typeof u === 'string' && u.length > 0)
            .filter((u) => !warmedImageUrlsRef.current.has(u))
        if (!urls.length) return

        let cancelled = false
        const MAX_CONCURRENCY = 4
        const loadOne = (url: string) => new Promise<void>((resolve) => {
            const img = new Image()
            img.decoding = 'async'
            img.onload = () => resolve()
            img.onerror = () => resolve()
            img.src = url
        })

        const run = async () => {
            for (let i = 0; i < urls.length; i += MAX_CONCURRENCY) {
                if (cancelled) return
                const batch = urls.slice(i, i + MAX_CONCURRENCY)
                await Promise.all(batch.map(async (url) => {
                    await loadOne(url)
                    warmedImageUrlsRef.current.add(url)
                }))
            }
        }

        void run()
        return () => { cancelled = true }
    }, [allCards])

    // Reset when section changes
    useEffect(() => {
        setRemovedIds(new Set())
    }, [sectionIndex])

    const itemIndex = allCards.length - activeDeck.length
    const totalItems = allCards.length

    // ─── Swipe boundary prevention ───
    const preventSwipe = useMemo(() => {
        const prevent: ('left' | 'right' | 'up' | 'down')[] = []
        // Prevent swipe up when at last card
        if (activeDeck.length <= 1) prevent.push('up')
        // Prevent swipe down when no cards have been removed (nothing to go back to)
        if (removedIds.size === 0) prevent.push('down')
        // Prevent swipe left when at last section
        if (sectionIndex >= sections.length - 1) prevent.push('left')
        // Prevent swipe right when at first section
        if (sectionIndex === 0) prevent.push('right')
        return prevent
    }, [activeDeck.length, removedIds.size, sectionIndex, sections.length])

    // ─── Section transition (smooth slide) ───
    const goSection = useCallback((dir: 1 | -1) => {
        const next = sectionIndex + dir
        if (next < 0 || next >= sections.length || sectionTransitioning.current) return

        // Instant transition
        sectionTransitioning.current = true
        setIsTransitioning(true)
        setSectionDirection(dir)
        setSectionIndex(next)

        // Reset transitioning flag after animation completes (approx duration)
        // Match with transition duration in motion.div (0.3s)
        setTimeout(() => {
            sectionTransitioning.current = false
            setIsTransitioning(false)
        }, 350)
    }, [sectionIndex, sections.length])

    // Handle card swipe (called immediately when threshold is met)
    const handleSwipe = useCallback((_id: string, direction: 'left' | 'right' | 'up' | 'down') => {
        if (direction === 'down') {
            // Go back: restore last removed card (card snaps back, previous card appears in front)
            setRemovedIds(prev => {
                const arr = Array.from(prev)
                if (arr.length > 0) arr.pop()
                return new Set(arr)
            })
        } else if (direction === 'left' || direction === 'right') {
            setIsTransitioning(true)
        }
    }, [])

    // Handle card leaving screen (called after fly-off animation completes)
    const handleCardLeftScreen = useCallback((id: string, direction: 'left' | 'right' | 'up' | 'down') => {
        setExitingCardId(null)
        setExitingDirection(null)
        if (direction === 'left') {
            goSection(1)
        } else if (direction === 'right') {
            goSection(-1)
        } else if (direction === 'up') {
            setRemovedIds(prev => new Set(prev).add(id))
        }
    }, [goSection])

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goSection(-1)
            if (e.key === 'ArrowRight') goSection(1)
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                if (activeDeck.length > 1) {
                    setRemovedIds(prev => new Set(prev).add(activeDeck[0].id))
                }
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                // Restore last removed card
                setRemovedIds(prev => {
                    const arr = Array.from(prev)
                    if (arr.length > 0) arr.pop()
                    return new Set(arr)
                })
            }
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [goSection, activeDeck, onClose])

    const currentCard = activeDeck[0]

    // ─── Card content renderer (neo-brutalist, sama dengan AI Labs / Edit) ───
    const renderCardContent = (card: CardItem) => (
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155] select-none isolate transform-gpu bg-white dark:bg-slate-900">
            {/* Background Image / Placeholder */}
            <div className="absolute inset-0">
                {card.imageUrl ? (
                    <FastImage src={card.imageUrl} alt={card.title} className="h-full w-full object-cover bg-slate-100 dark:bg-slate-800" draggable={false} priority />
                ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users className="w-12 h-12 sm:w-20 sm:h-20 text-slate-300 dark:text-slate-500" />
                    </div>
                )}
                <div className="absolute inset-0 bg-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 via-45% to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:via-45% dark:to-transparent h-[150%] -top-[50%]" />

                <div className="relative px-4 pb-4 sm:px-6 sm:pb-6 flex flex-col gap-1.5 pt-12">

                    <div className="flex flex-col">
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
                            {card.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {card.subtitle && (
                                <p className="text-slate-600 dark:text-slate-300 font-black text-xs sm:text-sm tracking-wide">
                                    {card.subtitle}
                                </p>
                            )}

                            {card.badges && card.badges.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {card.badges.map((b, i) => (
                                        <span key={i} className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                                            {b.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {card.description && (
                        <div className="relative pl-3 border-l-4 border-slate-900 dark:border-slate-600 my-1">
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold italic line-clamp-3 leading-relaxed">
                                "{card.description}"
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2 w-full">
                        {card.meta && card.meta.map((m, i) => {
                            const isIg = typeof m.text === 'string' && m.text.startsWith('@');
                            const Wrapper = isIg ? 'a' : 'div';
                            const props = isIg ? {
                                href: `https://instagram.com/${m.text.substring(1)}`,
                                target: '_blank',
                                rel: 'noopener noreferrer',
                                onClick: (e: React.MouseEvent) => e.stopPropagation(),
                                className: "pointer-events-auto group flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-200 border-2 border-slate-900 text-slate-900 transition-all active:scale-95 cursor-pointer flex-initial w-auto min-w-0 max-w-full shadow-[2px_2px_0_0_#0f172a]"
                            } : {
                                className: "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border-2 border-slate-900 text-slate-700 font-black flex-1 w-auto min-w-[40%] max-w-full"
                            };

                            return (
                                <Wrapper key={i} {...props}>
                                    <span className={`flex-shrink-0 ${isIg ? "text-pink-600 group-hover:text-pink-700" : "text-slate-500"}`}>
                                        {React.cloneElement(m.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                                    </span>
                                    <span className={`text-[10px] sm:text-[11px] font-black tracking-wide truncate ${isIg ? 'text-slate-900 group-hover:text-slate-800' : 'text-slate-600'}`}>
                                        {m.text}
                                    </span>
                                </Wrapper>
                            )
                        })}
                    </div>

                    {card.videoUrl && (
                        <div className="mt-2 w-full">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPlayVideo) {
                                        onPlayVideo(card.videoUrl!);
                                    } else {
                                        setVideoPopupUrl(card.videoUrl!);
                                    }
                                }}
                                className="pointer-events-auto flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-[11px] sm:text-xs font-black tracking-wider transition-all active:scale-95 border-2 border-slate-900 dark:border-slate-600 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155]"
                            >
                                <Play className="w-4 h-4 fill-white" />
                                <span>PLAY VIDEO</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    // Section transition: section yang keluar di belakang (zIndex 0) agar gambar lama tidak keliatan
    const sectionVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
            zIndex: 10,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            zIndex: 10,
        },
        exit: (dir: number) => ({
            x: dir > 0 ? '-100%' : '100%',
            opacity: 0,
            scale: 0.95,
            zIndex: 0,
        }),
    }

    return (
        <div className="fixed inset-0 z-[90] bg-slate-100 dark:bg-slate-950 flex flex-col">
            {/* Header - neo-brutalist, tanpa garis (bg nyatu) */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-slate-100 dark:bg-slate-950 z-20">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                        {React.cloneElement(currentSection.icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4" })}
                        <span className="text-xs sm:text-sm font-black uppercase truncate max-w-[120px] sm:max-w-none">{currentSection.label}</span>
                    </div>
                    {totalItems > 1 && (
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-black tabular-nums bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 px-2 py-0.5 rounded-lg shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155]">
                            {itemIndex + 1} / {totalItems}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5">
                        {sections.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => { if (i !== sectionIndex) { setSectionDirection(i > sectionIndex ? 1 : -1); setSectionIndex(i) } }}
                                className={`h-2 rounded-full transition-all duration-300 ${i === sectionIndex ? 'bg-slate-900 dark:bg-slate-600 w-6 shadow-[2px_0_0_0_#0f172a] dark:shadow-[2px_0_0_0_#334155]' : 'bg-slate-300 dark:bg-slate-600 w-2 hover:bg-slate-400 dark:hover:bg-slate-500'}`}
                                title={s.label}
                            />
                        ))}
                    </div>
                    {hideCloseButton ? (
                        <button
                          onClick={onClose}
                          className="w-8 h-8 bg-yellow-300 hover:bg-yellow-400 rounded-full flex items-center justify-center text-black border-2 border-slate-900 transition-all active:scale-95"
                        >
                          <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    ) : (
                        <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-amber-200 dark:hover:bg-slate-700 border-2 border-transparent hover:border-slate-900 dark:hover:border-slate-600 transition-all">
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Card Area - overflow-hidden + bg supaya gambar section lama tidak keliatan saat swipe */}
            <div className="flex-1 relative flex items-center justify-center px-4 sm:px-8 py-4 sm:py-6 z-50 overflow-hidden bg-slate-100 dark:bg-slate-950">
                <AnimatePresence custom={sectionDirection} initial={false}>
                    <motion.div
                        key={sectionIndex}
                        custom={sectionDirection}
                        variants={sectionVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.15 },
                            scale: { duration: 0.15 },
                        }}
                        className="absolute w-[88%] sm:w-full max-w-[380px] h-[66svh] sm:h-[68svh] select-none"
                    >
                        {/* Kartu depan selalu terlihat; deck belakang hanya kelihatan saat swipe naik/turun (bukan kiri/kanan) */}
                        {activeDeck.slice(0, 3).reverse().map((card, i, arr) => {
                            const cardIndex = arr.length - 1 - i
                            const isFrontCard = cardIndex === 0
                            const isNextCardDuringFlyOff = !!exitingCardId && cardIndex === 1 && exitingDirection === 'up'
                            const isHorizontalExit = exitingDirection === 'left' || exitingDirection === 'right'
                            const deckOpacity = isFrontCard ? 1 : (isNextCardDuringFlyOff ? 1 : (isHorizontalExit ? 0 : (showDeckBehind ? 0.85 : 0)))
                            const isExiting = exitingCardId === card.id
                            return (
                                <motion.div
                                    key={card.id}
                                    className="absolute inset-0 w-full h-full"
                                    initial={{ opacity: isFrontCard ? 1 : 0 }}
                                    animate={{ opacity: deckOpacity }}
                                    transition={{ duration: (isFrontCard || isNextCardDuringFlyOff) ? 0.2 : 0 }}
                                    style={{ zIndex: isExiting ? 0 : 3 - cardIndex }}
                                >
                                    <TinderCard
                                        index={cardIndex}
                                        preventSwipe={preventSwipe}
                                        onSwipe={(dir) => handleSwipe(card.id, dir)}
                                        onCardLeftScreen={(dir) => handleCardLeftScreen(card.id, dir)}
                                        onDragStart={() => setShowDeckBehind(false)}
                                        onDrag={({ x, y }) => {
                                            const absX = Math.abs(x)
                                            const absY = Math.abs(y)
                                            const threshold = 20
                                            setShowDeckBehind(absY > absX && absY > threshold)
                                        }}
                                        onDragEnd={() => setShowDeckBehind(false)}
                                        onFlyOffStart={isFrontCard ? (dir) => {
                                            setExitingCardId(card.id)
                                            setExitingDirection(dir)
                                            if (dir === 'left' || dir === 'right') setShowDeckBehind(false)
                                        } : undefined}
                                    >
                                        {renderCardContent(card)}
                                    </TinderCard>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation - bg nyatu dengan halaman */}
            <div className="flex-shrink-0 pt-3 pb-4 sm:px-6 sm:py-5 bg-slate-100 dark:bg-slate-950 z-20 w-full overflow-hidden">
                <div className="flex justify-start sm:justify-center w-full">
                    <div className="flex items-start sm:gap-6 overflow-x-auto pt-1 pb-2 no-scrollbar snap-x max-w-full w-full sm:w-auto px-2">
                        {sections.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    if (i !== sectionIndex) {
                                        setSectionDirection(i > sectionIndex ? 1 : -1)
                                        setSectionIndex(i)
                                    }
                                }}
                                className="flex flex-col items-center gap-2 w-[22vw] flex-shrink-0 sm:w-auto sm:min-w-[80px] sm:px-2 snap-center group transition-all"
                            >
                                <div className={`w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${i === sectionIndex
                                    ? 'border-slate-900 dark:border-slate-600 bg-slate-900 dark:bg-slate-600 text-white scale-105 shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155]'
                                    : 'border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-200 dark:hover:bg-slate-700'
                                    }`}>
                                    {React.cloneElement(s.icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5 sm:w-7 sm:h-7' })}
                                </div>
                                <span className={`text-[11px] sm:text-xs text-center truncate w-full px-1 sm:max-w-[88px] font-black transition-colors ${i === sectionIndex ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                    {s.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Fullscreen Video Modal - neo-brutalist */}
            <AnimatePresence>
                {videoPopupUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4"
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => setVideoPopupUrl(null)}
                                className="p-3 bg-white dark:bg-slate-800 hover:bg-amber-200 dark:hover:bg-slate-700 rounded-xl text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full max-w-4xl max-h-[85vh] aspect-video rounded-2xl overflow-hidden bg-black border-4 border-slate-900 dark:border-slate-700 relative"
                        >
                            <video
                                src={videoPopupUrl}
                                controls
                                autoPlay
                                preload="metadata"
                                playsInline
                                className="w-full h-full object-contain"
                            >
                                Maaf, browser Anda tidak mendukung pemutar video.
                            </video>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
