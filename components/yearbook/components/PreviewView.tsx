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
    index: number  // 0 = front, 1+ = behind
    preventSwipe?: ('left' | 'right' | 'up' | 'down')[]
}

function TinderCard({ children, onSwipe, onCardLeftScreen, index, preventSwipe = [] }: TinderCardProps) {
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
                className={`absolute w-full h-full rounded-3xl ${isFront ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : ''}`}
                style={{ x, y, rotate, opacity }}
                animate={controls}
                drag={isFront}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragEnd={isFront ? handleDragEnd : undefined}
                whileTap={isFront ? { cursor: 'grabbing' } : undefined}
            >
                {/* Scale wrapper with entrance popup animation (like swiparr's card appear) */}
                <motion.div
                    className="w-full h-full rounded-3xl"
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
}: PreviewViewProps) {
    const sections: Section[] = useMemo(() => [
        { type: 'cover', label: 'Sampul', icon: <BookOpen className="w-4 h-4" /> },
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
                description: t.message ? `"${t.message}"` : undefined,
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
                description: m.message ? `"${m.message}"` : undefined,
                meta: [
                    ...(m.date_of_birth ? [{ icon: <Cake className="w-3.5 h-3.5" />, text: m.date_of_birth }] : []),
                    ...(m.instagram ? [{ icon: <Instagram className="w-3.5 h-3.5" />, text: m.instagram }] : []),
                    ...(m.email ? [{ icon: <Mail className="w-3.5 h-3.5" />, text: m.email }] : []),
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

    // ─── Card content renderer ───
    const renderCardContent = (card: CardItem) => (
        <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 select-none isolate transform-gpu bg-neutral-900">
            {/* Background Image / Placeholder */}
            <div className="absolute inset-0">
                {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" draggable={false} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                        <Users className="w-12 h-12 sm:w-20 sm:h-20 text-white/5" />
                    </div>
                )}
                <div className="absolute inset-0 bg-transparent" />
            </div>

            {/* Premium Content Overlay - Super Compact */}
            <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black via-40% to-transparent h-[140%] -top-[40%]" />

                <div className="relative px-3 pb-3 sm:px-5 sm:pb-5 flex flex-col gap-1">

                    {/* Title & Info Group */}
                    <div className="flex flex-col">
                        <h2 className="text-lg sm:text-2xl font-bold text-white leading-none uppercase tracking-tighter drop-shadow-2xl">
                            {card.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {/* Role / Subtitle */}
                            {card.subtitle && (
                                <p className="text-lime-400 font-medium text-[10px] sm:text-xs tracking-wide">
                                    {card.subtitle}
                                </p>
                            )}

                            {/* Badges moved here for compactness */}
                            {card.badges && card.badges.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {card.badges.map((b, i) => (
                                        <span key={i} className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md uppercase tracking-wide bg-white/10 text-white border border-white/20 shadow-sm`}>
                                            {b.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description - Compact */}
                    {card.description && (
                        <div className="relative pl-2.5 border-l-2 border-lime-400/50 my-0.5 rounded-sm">
                            <p className="text-[10px] sm:text-xs text-neutral-300 italic line-clamp-2 leading-relaxed opacity-90">
                                "{card.description}"
                            </p>
                        </div>
                    )}

                    {/* Meta & Actions - Flex Layout for Content-Aware Sizing */}
                    <div className="flex flex-wrap gap-1.5 mt-1 w-full">
                        {card.meta && card.meta.map((m, i) => {
                            const isIg = typeof m.text === 'string' && m.text.startsWith('@');
                            const Wrapper = isIg ? 'a' : 'div';
                            const props = isIg ? {
                                href: `https://instagram.com/${m.text.substring(1)}`,
                                target: '_blank',
                                rel: 'noopener noreferrer',
                                onClick: (e: React.MouseEvent) => e.stopPropagation(),
                                className: "pointer-events-auto group flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 cursor-pointer flex-initial w-auto min-w-0 max-w-full"
                            } : {
                                className: "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300 flex-1 w-auto min-w-[40%] max-w-full"
                            };

                            return (
                                <Wrapper key={i} {...props}>
                                    <span className={`flex-shrink-0 ${isIg ? "text-lime-400 group-hover:text-lime-300 transition-colors" : "text-neutral-400"}`}>
                                        {React.cloneElement(m.icon as React.ReactElement, { size: 12 })}
                                    </span>
                                    <span className={`text-[9px] sm:text-[10px] font-medium leading-tight break-all ${isIg ? 'text-white group-hover:text-lime-50' : 'text-neutral-300'}`}>
                                        {m.text}
                                    </span>
                                </Wrapper>
                            )
                        })}
                    </div>

                    {/* Primary CTA Button (Video) */}
                    {card.videoUrl && (
                        <div className="mt-1 w-full">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onPlayVideo?.(card.videoUrl!) }}
                                className="pointer-events-auto flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-500 text-black text-[10px] sm:text-xs font-bold transition-all active:scale-95 shadow-[0_0_15px_-3px_rgba(163,230,53,0.3)]"
                            >
                                <Play className="w-3.5 h-3.5 fill-black" />
                                <span>PLAY VIDEO</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    // Section transition animation variants
    const sectionVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            zIndex: 1,
        },
        exit: (dir: number) => ({
            x: dir > 0 ? '-100%' : '100%',
            opacity: 0,
            scale: 0.95,
            zIndex: 0,
        }),
    }

    return (
        <div className="fixed inset-0 z-[90] bg-black flex flex-col">
            {/* Top Bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-black/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 px-2 py-0.5 sm:gap-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-lime-500/10 border border-lime-500/20">
                        {currentSection.icon}
                        <span className="text-[10px] sm:text-xs font-bold text-lime-400 truncate max-w-[100px] sm:max-w-none">{currentSection.label}</span>
                    </div>
                    {totalItems > 1 && (
                        <span className="text-[10px] sm:text-xs text-neutral-500 font-mono tabular-nums">
                            {itemIndex + 1}/{totalItems}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="hidden sm:flex items-center gap-1">
                        {sections.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => { if (i !== sectionIndex) { setSectionDirection(i > sectionIndex ? 1 : -1); setSectionIndex(i) } }}
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${i === sectionIndex ? 'bg-lime-400 w-4 sm:w-5' : 'bg-white/20 hover:bg-white/40'}`}
                                title={s.label}
                            />
                        ))}
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Main Card Area */}
            <div className="flex-1 relative flex items-center justify-center px-5 sm:px-8 py-3 sm:py-6 z-50">
                {/* Dynamic background blur removed for consistent black background */}

                {/* Animated section container with AnimatePresence for smooth transitions */}
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
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.2 },
                        }}
                        className="absolute w-[88%] sm:w-full max-w-[380px] h-[66svh] sm:h-[68svh] select-none z-50"
                    >
                        {/* Render card deck inside animated section */}
                        {activeDeck.slice(0, 3).reverse().map((card, i, arr) => {
                            const cardIndex = arr.length - 1 - i
                            return (
                                <motion.div
                                    key={card.id}
                                    className="absolute inset-0 w-full h-full"
                                    initial={{ opacity: cardIndex > 0 ? 0 : 1 }}
                                    animate={{ opacity: isTransitioning && cardIndex > 0 ? 0 : 1 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ zIndex: 3 - cardIndex }}
                                >
                                    <TinderCard
                                        index={cardIndex}
                                        preventSwipe={preventSwipe}
                                        onSwipe={(dir) => handleSwipe(card.id, dir)}
                                        onCardLeftScreen={(dir) => handleCardLeftScreen(card.id, dir)}
                                    >
                                        {renderCardContent(card)}
                                    </TinderCard>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation */}
            <div className="flex-shrink-0 pt-3 pb-2 sm:px-4 sm:py-4 bg-black/80 backdrop-blur-md z-20 w-full overflow-hidden">
                {/* Section tabs */}
                <div className="flex justify-start sm:justify-center w-full">
                    <div className="flex items-start sm:gap-4 overflow-x-auto pt-1 pb-2 no-scrollbar snap-x max-w-full w-full sm:w-auto">
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
                                className="flex flex-col items-center gap-1.5 w-[20vw] flex-shrink-0 sm:w-auto sm:min-w-[72px] sm:px-2 snap-center group transition-all"
                            >
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${i === sectionIndex
                                    ? 'border-lime-400 bg-lime-400/10 text-lime-400 scale-105 shadow-[0_0_15px_-3px_rgba(163,230,53,0.4)]'
                                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-500 lg:group-hover:border-neutral-600 lg:group-hover:text-neutral-300'
                                    }`}>
                                    {React.cloneElement(s.icon as React.ReactElement, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
                                </div>
                                <span className={`text-[10px] sm:text-xs text-center truncate w-full px-1 sm:max-w-[72px] transition-colors ${i === sectionIndex ? 'text-lime-400 font-medium' : 'text-neutral-500'}`}>
                                    {s.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
