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
import { Book, BookOpen, MessageSquare, Users, Play, X, Instagram, Cake } from 'lucide-react'

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)
import FastImage from '@/components/ui/FastImage'

function stripQuotes(s: string): string {
    return s.replace(/^["""\u201C\u201D]+/, '').replace(/["""\u201C\u201D]+$/, '').trim()
}

function sortNameAsc<T extends { name: string }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }))
}

function sortStudentNameAsc<T extends { student_name: string }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => a.student_name.localeCompare(b.student_name, 'id', { sensitivity: 'base' }))
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
    photoUrls?: string[]
    title: string
    subtitle?: string
    badges?: { label: string; color?: string }[]
    description?: string
    videoUrl?: string | null
    meta?: { icon: React.ReactNode; text: string }[]
}

// ─── Framer-motion Tinder Card ───
interface TinderCardProps {
    children: React.ReactNode
    onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
    onCardLeftScreen?: (direction: 'left' | 'right' | 'up' | 'down') => void
    onDragStart?: () => void
    onDrag?: (offset: { x: number; y: number }) => void
    onDragEnd?: () => void
    onFlyOffStart?: (direction: 'left' | 'right' | 'up' | 'down') => void
    index: number
    preventSwipe?: ('left' | 'right' | 'up' | 'down')[]
}

function TinderCard({ children, onSwipe, onCardLeftScreen, onDragStart, onDrag, onDragEnd, onFlyOffStart, index, preventSwipe = [] }: TinderCardProps) {
    const controls = useAnimation()
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const isAnimating = useRef(false)
    const isFront = index === 0

    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-200, -170, 0, 170, 200], [0, 1, 1, 1, 0])

    const prevIndexRef = useRef(index)
    useEffect(() => {
        if (prevIndexRef.current !== 0 && index === 0) {
            controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 })
        }
        // Kalau kartu pindah posisi stack (mis. jadi kartu belakang), pastikan tidak bawa sisa x/y dari interaksi sebelumnya.
        if (prevIndexRef.current !== index && index !== 0) {
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
            isAnimating.current = true
            onSwipe?.(direction)
            onFlyOffStart?.(direction)

            const flyVal = 300
            let targetX = 0, targetY = 0, targetRotate = 0
            switch (direction) {
                case 'left': targetX = -flyVal; targetRotate = -20; break
                case 'right': targetX = flyVal; targetRotate = 20; break
                case 'up': targetY = -flyVal; break
                case 'down': targetY = flyVal; break
            }
            if (direction === 'left' || direction === 'right') {
                targetY = y.get() + (velocityY * 2)
            }

            await controls.start({
                x: targetX, y: targetY, rotate: targetRotate, opacity: 0,
                transition: { duration: 0.25, ease: 'easeOut' },
            })

            onCardLeftScreen?.(direction)
            isAnimating.current = false
        } else {
            controls.start({
                x: 0, y: 0, rotate: 0,
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
                onDragStart={isFront ? () => onDragStart?.() : undefined}
                onDrag={isFront ? (_: unknown, info: PanInfo) => onDrag?.({ x: info.offset.x, y: info.offset.y }) : undefined}
                onDragEnd={isFront ? (e: unknown, info: PanInfo) => { handleDragEnd(e, info); onDragEnd?.() } : undefined}
                whileTap={isFront ? { cursor: 'grabbing' } : undefined}
            >
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
    hideCloseButton,
}: PreviewViewProps) {
    const warmedImageUrlsRef = useRef<Set<string>>(new Set())
    const sortedTeachers = useMemo(() => sortNameAsc(teachers), [teachers])
    const sortedClasses = useMemo(() => sortNameAsc(classes), [classes])

    const sections: Section[] = useMemo(() => [
        { type: 'cover', label: 'Cover', icon: <Book className="w-4 h-4" /> },
        ...(sortedTeachers.length > 0 ? [{ type: 'sambutan' as const, label: 'Sambutan', icon: <MessageSquare className="w-4 h-4" /> }] : []),
        ...sortedClasses.map((c, i) => ({
            type: 'class' as const,
            label: c.name,
            icon: <Users className="w-4 h-4" />,
            classId: c.id,
            classIndex: i,
        })),
    ], [sortedTeachers.length, sortedClasses])

    const [sectionIndex, setSectionIndex] = useState(0)
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
    const [sectionDirection, setSectionDirection] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const sectionTransitioning = useRef(false)
    const [videoPopupUrl, setVideoPopupUrl] = useState<string | null>(null)
    const [showDeckBehind, setShowDeckBehind] = useState(false)
    const [exitingCardId, setExitingCardId] = useState<string | null>(null)
    const [exitingDirection, setExitingDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null)
    const [photoIndexByCardId, setPhotoIndexByCardId] = useState<Record<string, number>>({})
    const photoTapRef = useRef<{ x: number; y: number; cardId: string | null }>({ x: 0, y: 0, cardId: null })
    // Progress swipe ke atas (0..1) untuk reveal kartu belakang dengan smooth.
    const [upRevealProgress, setUpRevealProgress] = useState(0)

    // ── Navbar scroll ref (desktop wheel + drag-to-scroll) ──
    const navScrollRef = useRef<HTMLDivElement>(null)
    const navDragRef = useRef<{ isDragging: boolean; startX: number; scrollLeft: number }>({ isDragging: false, startX: 0, scrollLeft: 0 })

    const handleNavWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        const el = navScrollRef.current
        if (!el) return
        const canScrollH = el.scrollWidth > el.clientWidth
        if (!canScrollH) return
        e.preventDefault()
        el.scrollLeft += e.deltaY + e.deltaX
    }, [])

    const handleNavMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = navScrollRef.current
        if (!el) return
        navDragRef.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
        el.style.cursor = 'grabbing'
    }, [])

    const handleNavMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = navScrollRef.current
        if (!el || !navDragRef.current.isDragging) return
        e.preventDefault()
        const x = e.pageX - el.offsetLeft
        const walk = x - navDragRef.current.startX
        el.scrollLeft = navDragRef.current.scrollLeft - walk
    }, [])

    const handleNavMouseUp = useCallback(() => {
        navDragRef.current.isDragging = false
        if (navScrollRef.current) navScrollRef.current.style.cursor = 'grab'
    }, [])

    const currentSection = sections[sectionIndex] || sections[0]

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
            return sortedTeachers.map(t => {
                const ordered = (t.photos || [])
                    .slice()
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((p) => p.file_url)
                    .filter(Boolean) as string[]
                const photoUrls = (ordered.length > 0 ? ordered : (t.photo_url ? [t.photo_url] : [])).slice(0, 4)
                return {
                    id: t.id,
                    imageUrl: photoUrls[0] ?? null,
                    photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
                    title: t.name,
                    subtitle: t.title || '',
                    description: t.message ? stripQuotes(t.message) : undefined,
                    videoUrl: t.video_url,
                }
            })
        }
        if (currentSection.type === 'class' && currentSection.classId) {
            const classObj = sortedClasses[currentSection.classIndex!]
            const members = sortStudentNameAsc(membersByClass[currentSection.classId] || [])
            const classCover: CardItem = {
                id: `class-cover-${currentSection.classId}`,
                imageUrl: classObj?.batch_photo_url || null,
                title: classObj?.name || 'Kelas',
                subtitle: `${members.length} Anggota`,
            }
            const memberCards: CardItem[] = members.map(m => {
                const fromMember = (m.photos || []).filter(Boolean).slice(0, 4) as string[]
                const photoUrls =
                    fromMember.length > 0
                        ? fromMember
                        : firstPhotoByStudent?.[m.student_name]
                            ? [firstPhotoByStudent[m.student_name]]
                            : []
                return {
                    id: `${currentSection.classId}-${m.user_id}`,
                    imageUrl: photoUrls[0] ?? null,
                    photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
                    title: m.student_name,
                    subtitle: undefined,
                    videoUrl: m.video_url,
                    description: m.message ? stripQuotes(m.message) : undefined,
                    meta: [
                        ...(m.date_of_birth ? [{ icon: <Cake className="w-3.5 h-3.5" />, text: m.date_of_birth }] : []),
                        ...(m.instagram ? [{ icon: <Instagram className="w-3.5 h-3.5" />, text: m.instagram }] : []),
                        ...((m as any).tiktok ? [{ icon: <TiktokIcon className="w-3.5 h-3.5" />, text: (m as any).tiktok }] : []),
                    ],
                }
            })
            return [classCover, ...memberCards]
        }
        return []
    }, [currentSection, album, sortedTeachers, sortedClasses, membersByClass, firstPhotoByStudent])

    const activeDeck = useMemo(() =>
        allCards.filter(c => !removedIds.has(c.id)),
        [allCards, removedIds]
    )

    useEffect(() => {
        const urlSet = new Set<string>()
        for (const c of allCards) {
            for (const u of c.photoUrls || []) {
                if (typeof u === 'string' && u.length > 0) urlSet.add(u)
            }
            if (typeof c.imageUrl === 'string' && c.imageUrl.length > 0) urlSet.add(c.imageUrl)
        }
        const urls = [...urlSet].filter((u) => !warmedImageUrlsRef.current.has(u))
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

    useEffect(() => {
        setRemovedIds(new Set())
        setPhotoIndexByCardId({})
    }, [sectionIndex])

    const itemIndex = allCards.length - activeDeck.length
    const totalItems = allCards.length

    const preventSwipe = useMemo(() => {
        const prevent: ('left' | 'right' | 'up' | 'down')[] = []
        if (activeDeck.length <= 1) prevent.push('up')
        if (removedIds.size === 0) prevent.push('down')
        if (sectionIndex >= sections.length - 1) prevent.push('left')
        if (sectionIndex === 0) prevent.push('right')
        return prevent
    }, [activeDeck.length, removedIds.size, sectionIndex, sections.length])

    const goSection = useCallback((dir: 1 | -1) => {
        const next = sectionIndex + dir
        if (next < 0 || next >= sections.length || sectionTransitioning.current) return
        sectionTransitioning.current = true
        setIsTransitioning(true)
        setSectionDirection(dir)
        setSectionIndex(next)
        setTimeout(() => {
            sectionTransitioning.current = false
            setIsTransitioning(false)
        }, 350)
    }, [sectionIndex, sections.length])

    const handleSwipe = useCallback((_id: string, direction: 'left' | 'right' | 'up' | 'down') => {
        if (direction === 'left' || direction === 'right') {
            setIsTransitioning(true)
        }
    }, [])

    const handleCardLeftScreen = useCallback((id: string, direction: 'left' | 'right' | 'up' | 'down') => {
        setExitingCardId(null)
        setExitingDirection(null)
        if (direction === 'left') {
            goSection(1)
        } else if (direction === 'right') {
            goSection(-1)
        } else if (direction === 'up') {
            setRemovedIds(prev => new Set(prev).add(id))
        } else if (direction === 'down') {
            // Go back: restore last removed card after animation completes
            setRemovedIds(prev => {
                const arr = Array.from(prev)
                if (arr.length > 0) arr.pop()
                return new Set(arr)
            })
        }
    }, [goSection])

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

    const cycleCardPhoto = useCallback((card: CardItem) => {
        const urls = card.photoUrls?.filter(Boolean) ?? []
        if (urls.length <= 1) return
        setPhotoIndexByCardId((prev) => {
            const cur = prev[card.id] ?? 0
            return { ...prev, [card.id]: (cur + 1) % urls.length }
        })
    }, [])

    // ─── Card content renderer ───
    const renderCardContent = (card: CardItem, isFrontCard: boolean) => {
        const galleryUrls = (card.photoUrls?.filter(Boolean).length
            ? card.photoUrls!.filter(Boolean)
            : card.imageUrl
                ? [card.imageUrl]
                : []) as string[]
        const gLen = galleryUrls.length
        const photoIdx = gLen > 0 ? (photoIndexByCardId[card.id] ?? 0) % gLen : 0
        const displayUrl = gLen > 0 ? galleryUrls[photoIdx] : null
        const showDots = gLen > 1

        return (
            <div className="relative w-full h-full rounded-3xl overflow-hidden select-none isolate transform-gpu bg-white dark:bg-black ring-2 ring-slate-900 dark:ring-white/80">
                {/* ── Photo ── */}
                <div
                    className={`absolute inset-0 ${isFrontCard && showDots ? 'cursor-pointer' : ''}`}
                    onPointerDown={
                        isFrontCard && showDots
                            ? (e) => { photoTapRef.current = { x: e.clientX, y: e.clientY, cardId: card.id } }
                            : undefined
                    }
                    onPointerUp={
                        isFrontCard && showDots
                            ? (e) => {
                                const t = photoTapRef.current
                                if (t.cardId !== card.id) return
                                const dx = e.clientX - t.x
                                const dy = e.clientY - t.y
                                if (dx * dx + dy * dy < 100) cycleCardPhoto(card)
                                photoTapRef.current = { ...photoTapRef.current, cardId: null }
                            }
                            : undefined
                    }
                >
                    {displayUrl ? (
                        <FastImage src={displayUrl} alt={card.title} className="h-full w-full object-cover" draggable={false} priority />
                    ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Users className="w-16 h-16 text-slate-300 dark:text-zinc-600" />
                        </div>
                    )}
                </div>

                {/* ── Photo dots ── */}
                {showDots && (
                    <div className="absolute top-2 left-0 right-0 z-30 flex justify-center gap-1.5 pointer-events-none">
                        {galleryUrls.map((_, i) => (
                            <span
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === photoIdx
                                        ? 'bg-slate-900 dark:bg-white w-6 shadow-[0_0_6px_rgba(0,0,0,0.3)] dark:shadow-[0_0_6px_rgba(255,255,255,0.5)]'
                                        : 'bg-slate-900/30 dark:bg-white/40 w-1.5'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* ── Bottom gradient: light = white, dark = black ── */}
                <div
                    className="absolute inset-x-0 z-10 pointer-events-none dark:hidden"
                    style={{
                        bottom: '-1px',
                        height: 'calc(70% + 1px)',
                        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.3) 60%, rgba(255,255,255,0) 100%)',
                    }}
                />
                <div
                    className="absolute inset-x-0 z-10 pointer-events-none hidden dark:block"
                    style={{
                        bottom: '-1px',
                        height: 'calc(70% + 1px)',
                        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
                    }}
                />

                {/* ── Text content ── */}
                <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-2">
                    {/* Name */}
                    <h2
                        className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase drop-shadow-lg"
                        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                    >
                        {card.title}
                    </h2>

                    {/* Subtitle */}
                    {card.subtitle && (
                        <p className="text-sm font-semibold text-slate-600 dark:text-white/80 tracking-wide">
                            {card.subtitle}
                        </p>
                    )}

                    {/* Badges */}
                    {card.badges && card.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {card.badges.map((b, i) => (
                                <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-slate-900/10 dark:bg-white/15 backdrop-blur-sm text-slate-900 dark:text-white ring-1 ring-slate-900/15 dark:ring-white/20">
                                    {b.label}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description / message */}
                    {card.description && (
                        <div className="relative pl-3 border-l-2 border-slate-900 dark:border-white/40 mt-1">
                            <p className="text-sm text-slate-600 dark:text-white/85 font-medium italic line-clamp-3 leading-relaxed">
                                &ldquo;{card.description}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Meta: birthday, instagram - icon only, clickable if full URL */}
                    {card.meta && card.meta.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-1">
                            {card.meta.map((m, i) => {
                                const text = typeof m.text === 'string' ? m.text : ''
                                const isClickableUrl = /^https?:\/\//.test(text)
                                const Wrapper = isClickableUrl ? 'a' : 'div'
                                const wrapperProps = isClickableUrl ? {
                                    href: text,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    onClick: (e: React.MouseEvent) => e.stopPropagation(),
                                    className: 'pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/10 dark:bg-white/15 backdrop-blur-sm text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white/80 transition-all hover:bg-slate-900/20 dark:hover:bg-white/25 active:scale-95 cursor-pointer',
                                } : {
                                    className: 'flex items-center justify-center w-8 h-8 rounded-full bg-slate-900/10 dark:bg-white/15 backdrop-blur-sm text-slate-700 dark:text-white/80 ring-1 ring-slate-900 dark:ring-white/80',
                                }
                                return (
                                    <Wrapper key={i} {...wrapperProps}>
                                        <span className="flex-shrink-0 text-slate-400 dark:text-white/60">
                                            {React.cloneElement(m.icon as React.ReactElement<{ size?: number }>, { size: 14 })}
                                        </span>
                                    </Wrapper>
                                )
                            })}
                        </div>
                    )}

                    {/* Video button */}
                    {card.videoUrl && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onPlayVideo) onPlayVideo(card.videoUrl!)
                                else setVideoPopupUrl(card.videoUrl!)
                            }}
                            className="pointer-events-auto mt-1 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-slate-900/10 dark:bg-white/15 backdrop-blur-md text-slate-900 dark:text-white text-xs font-bold tracking-widest uppercase ring-1 ring-slate-900 dark:ring-white/80 transition-all hover:bg-slate-900/20 dark:hover:bg-white/25 active:scale-[0.97]"
                        >
                            <Play className="w-4 h-4 fill-slate-900 dark:fill-white" />
                            <span>Play Video</span>
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const sectionVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? '100%' : '-100%',
            opacity: 0, scale: 0.95, zIndex: 10,
        }),
        center: { x: 0, opacity: 1, scale: 1, zIndex: 10 },
        exit: (dir: number) => ({
            x: dir > 0 ? '-100%' : '100%',
            opacity: 0, scale: 0.95, zIndex: 0,
        }),
    }

    return (
        <div className="fixed inset-0 z-[90] bg-slate-100 dark:bg-zinc-950 flex flex-col">
            {/* ── Floating top bar: label left, close right ── */}
            <div
                className="absolute z-[60] flex items-center justify-between pointer-events-none"
                style={{
                    top: 'calc(env(safe-area-inset-top) + 10px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(92vw, 420px)',
                }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center gap-1.5 px-3 rounded-full bg-white/85 dark:bg-black/55 backdrop-blur-md text-slate-900 dark:text-white ring-1 ring-slate-900/10 dark:ring-white/15 leading-none shadow-sm"
                        style={{ height: 32, fontSize: 12, fontWeight: 650 }}
                    >
                        {React.cloneElement(currentSection.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4 opacity-70' })}
                        <span className="truncate max-w-[140px] sm:max-w-none tracking-wide">{currentSection.label}</span>
                    </div>
                    {totalItems > 1 && (
                        <div
                            className="flex items-center tabular-nums px-3 rounded-full bg-white/85 dark:bg-black/55 backdrop-blur-md text-slate-600 dark:text-white/75 ring-1 ring-slate-900/10 dark:ring-white/15 leading-none shadow-sm"
                            style={{ height: 32, fontSize: 12, fontWeight: 650 }}
                        >
                            {itemIndex + 1}/{totalItems}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <img src="/img/logo.png" alt="Logo" className="w-5 h-5 object-contain opacity-70" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="pointer-events-auto rounded-full flex items-center justify-center bg-white/85 dark:bg-black/75 backdrop-blur-md text-slate-900 dark:text-white hover:bg-white dark:hover:bg-black transition-all ring-1 ring-slate-900/15 dark:ring-white/30 p-0 m-0 border-0"
                        style={{ height: 32, width: 32 }}
                    >
                        <X style={{ width: 18, height: 18 }} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* ── Card Area (full height) ── */}
            <div className="flex-1 relative flex items-center justify-center px-3 sm:px-6 pt-2 pb-2 z-50 overflow-hidden bg-slate-100 dark:bg-zinc-950">
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
                        className="absolute w-[92%] sm:w-full max-w-[420px] h-[calc(100%-8px)] select-none"
                    >
                        {activeDeck.slice(0, 3).reverse().map((card, i, arr) => {
                            const cardIndex = arr.length - 1 - i
                            const isFrontCard = cardIndex === 0
                            const isNextCardDuringFlyOff = !!exitingCardId && cardIndex === 1 && exitingDirection === 'up'
                            const isHorizontalExit = exitingDirection === 'left' || exitingDirection === 'right'
                            const deckOpacity = isFrontCard ? 1 : (isNextCardDuringFlyOff ? 1 : (isHorizontalExit ? 0 : (showDeckBehind ? 0.85 : 0)))
                            const isExiting = exitingCardId === card.id
                            const shouldAnimateDeckOpacity =
                                isFrontCard ||
                                isNextCardDuringFlyOff ||
                                // Saat swipe ke ATAS (reveal deck), fade-in kartu belakang harus smooth (tidak pop).
                                (showDeckBehind && !isHorizontalExit)

                            // Reveal kartu belakang secara progresif supaya tidak “loncat”.
                            const behindProgress = cardIndex === 1 ? upRevealProgress : 0
                            const behindY = cardIndex === 1 ? (10 * (1 - behindProgress)) : 0
                            const behindScale = cardIndex === 1 ? (0.975 + 0.025 * behindProgress) : 1
                            return (
                                <motion.div
                                    key={card.id}
                                    className="absolute inset-0 w-full h-full"
                                    initial={{ opacity: isFrontCard ? 1 : 0, y: 0, scale: 1 }}
                                    animate={{ opacity: deckOpacity, y: behindY, scale: behindScale }}
                                    transition={{
                                        opacity: { duration: shouldAnimateDeckOpacity ? 0.16 : 0 },
                                        y: { type: 'spring', stiffness: 260, damping: 26 },
                                        scale: { type: 'spring', stiffness: 260, damping: 26 },
                                    }}
                                    style={{ zIndex: isExiting ? 0 : 3 - cardIndex }}
                                >
                                    <TinderCard
                                        index={cardIndex}
                                        preventSwipe={preventSwipe}
                                        onSwipe={(dir) => handleSwipe(card.id, dir)}
                                        onCardLeftScreen={(dir) => handleCardLeftScreen(card.id, dir)}
                                        onDragStart={() => { setShowDeckBehind(false); setUpRevealProgress(0) }}
                                        onDrag={({ x, y }) => {
                                            const absX = Math.abs(x)
                                            const absY = Math.abs(y)
                                            const threshold = 20
                                            // Deck belakang hanya boleh muncul saat gesture ke ATAS (next). Swipe bawah (back) jangan bocorin deck.
                                            const isUp = absY > absX && absY > threshold && y < 0
                                            setShowDeckBehind(isUp)
                                            if (isUp) {
                                                const p = Math.max(0, Math.min(1, (-y) / 120))
                                                setUpRevealProgress(p)
                                            } else {
                                                setUpRevealProgress(0)
                                            }
                                        }}
                                        onDragEnd={() => { setShowDeckBehind(false); setUpRevealProgress(0) }}
                                        onFlyOffStart={isFrontCard ? (dir) => {
                                            setExitingCardId(card.id)
                                            setExitingDirection(dir)
                                            if (dir === 'left' || dir === 'right') setShowDeckBehind(false)
                                        } : undefined}
                                    >
                                        {renderCardContent(card, isFrontCard)}
                                    </TinderCard>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Bottom Navigation ── */}
            <div
                className="flex-shrink-0 z-20 w-full flex justify-center"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)', paddingTop: 8 }}
            >
                <div
                    ref={navScrollRef}
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 ring-1 ring-black/8 dark:ring-white/10 overflow-x-auto no-scrollbar max-w-[92vw] sm:max-w-[480px] select-none"
                    style={{ cursor: 'grab' }}
                    onWheel={handleNavWheel}
                    onMouseDown={handleNavMouseDown}
                    onMouseMove={handleNavMouseMove}
                    onMouseUp={handleNavMouseUp}
                    onMouseLeave={handleNavMouseUp}
                >
                    {sections.map((s, i) => {
                        const isActive = i === sectionIndex
                        const isClassType = s.type === 'class'
                        const prevIsClassType = i > 0 && sections[i - 1]?.type === 'class'
                        const showDivider = isClassType && !prevIsClassType
                        return (
                            <React.Fragment key={i}>
                                {showDivider && (
                                    <span className="flex-shrink-0 w-px h-5 rounded-full bg-slate-900/12 dark:bg-white/12 mx-0.5" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isActive) {
                                            setSectionDirection(i > sectionIndex ? 1 : -1)
                                            setSectionIndex(i)
                                        }
                                    }}
                                    className="relative flex items-center gap-1.5 flex-shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-slate-900/50 dark:focus-visible:ring-white/50 transition-colors duration-150"
                                    style={{ padding: '6px 10px', minWidth: 0 }}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="nav-pill"
                                            className="absolute inset-0 rounded-xl bg-slate-900 dark:bg-white shadow-md shadow-slate-900/20 dark:shadow-white/10"
                                            transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
                                        />
                                    )}
                                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${isActive ? 'text-white dark:text-zinc-900' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200'}`}>
                                        {React.cloneElement(s.icon as React.ReactElement<{ className?: string }>, {
                                            className: 'w-3.5 h-3.5 flex-shrink-0',
                                        })}
                                        <span
                                            className="text-[11px] font-bold tracking-wide truncate"
                                            style={{ maxWidth: isActive ? 72 : 52 }}
                                        >
                                            {s.label}
                                        </span>
                                    </span>
                                </button>
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>

            {/* ── Video Modal ── */}
            <AnimatePresence>
                {videoPopupUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 dark:bg-black/95 flex flex-col items-center justify-center p-4"
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => setVideoPopupUrl(null)}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-full max-w-4xl max-h-[85vh] aspect-video rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 relative"
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
