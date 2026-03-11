// (Cancelling this edit to read file first)

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import HTMLFlipBook from 'react-pageflip'
import { Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react'

type VideoHotspot = {
  id: string
  page_id: string
  video_url: string
  x: number
  y: number
  width: number
  height: number
}

type ManualFlipbookPage = {
  id: string
  page_number: number
  image_url: string
  width?: number
  height?: number
  flipbook_video_hotspots?: VideoHotspot[]
}

type ManualFlipbookViewerProps = {
  pages: ManualFlipbookPage[]
  onPlayVideo?: (url: string) => void
  className?: string
}

const Page = React.forwardRef<HTMLDivElement, { page: ManualFlipbookPage, onPlay?: (url: string) => void }>((props, ref) => {
  return (
    <div className="page-content bg-white h-full w-full relative overflow-hidden shadow-none" ref={ref}>
      <div className="w-full h-full relative">
        {/* Image - full cover */}
        <img
          src={props.page.image_url}
          alt={`Page ${props.page.page_number}`}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />

        {/* Hotspots */}
        {props.page.flipbook_video_hotspots?.map(h => (
          <Hotspot key={h.id} h={h} onPlay={props.onPlay} />
        ))}

        {/* Center fold shadow */}
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none opacity-30 z-10" />
      </div>
    </div>
  )
})
Page.displayName = 'Page'

// Decorative blank page (forwardRef required by react-pageflip) — putih ke abu-abuan
const BLANK_PAGE_STYLE = { background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 70%, #e2e8f0 100%)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.04), inset 0 0 8px rgba(0,0,0,0.02)' }
const BlankPage = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} data-blank-page className="page-content blank-page-content h-full w-full relative overflow-hidden border border-slate-200" style={BLANK_PAGE_STYLE}>
    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-slate-300/50 rounded-tl-sm" />
    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-slate-300/50 rounded-tr-sm" />
    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-slate-300/50 rounded-bl-sm" />
    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-slate-300/50 rounded-br-sm" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-3 opacity-20">
        <div className="w-12 h-px bg-slate-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <div className="w-12 h-px bg-slate-400" />
      </div>
    </div>
  </div>
))
BlankPage.displayName = 'BlankPage'

// Ukuran "stage" buku (library render di sini, lalu di-scale ke layar)
const BOOK_STAGE_WIDTH = 1400
const BOOK_STAGE_HEIGHT = 900

// Memoized wrapper that patches DOM methods to suppress react-pageflip conflicts
const FlipBookInner = React.memo(({ flipbookKey, pageElements, isMobileScreen, bookRef, onFlip, stageWidth, stageHeight }: {
  flipbookKey: string
  pageElements: React.ReactNode[]
  isMobileScreen: boolean
  bookRef: React.RefObject<any>
  onFlip: (pageNum: number) => void
  stageWidth: number
  stageHeight: number
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const patched = new WeakSet<Node>()

    // Patch a single node's removeChild and insertBefore
    const patchNode = (node: Node) => {
      if (patched.has(node)) return
      patched.add(node)
      const origRC = node.removeChild.bind(node)
      const origIB = node.insertBefore.bind(node)
      node.removeChild = function <T extends Node>(child: T): T {
        try { return origRC(child) } catch { return child }
      }
      node.insertBefore = function <T extends Node>(n: T, ref: Node | null): T {
        try { return origIB(n, ref) } catch { return n }
      }
    }

    // Patch container and all existing descendants
    patchNode(el)
    el.querySelectorAll('*').forEach(patchNode)

    // Watch for new elements and patch them too
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            patchNode(node)
              ; (node as Element).querySelectorAll('*').forEach(patchNode)
          }
        })
      })
    })
    observer.observe(el, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [flipbookKey])

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0"
      style={{ width: stageWidth, height: stageHeight }}
    >
      {/* @ts-ignore */}
      <HTMLFlipBook
        key={flipbookKey}
        width={stageWidth / 2}
        height={stageHeight}
        size="fixed"
        minWidth={stageWidth / 2}
        maxWidth={stageWidth / 2}
        minHeight={stageHeight}
        maxHeight={stageHeight}
        maxShadowOpacity={0.5}
        showCover={true}
        mobileScrollSupport={true}
        className="demo-book"
        ref={bookRef}
        startPage={0}
        drawShadow={true}
        flippingTime={1000}
        usePortrait={isMobileScreen}
        startZIndex={0}
        autoSize={true}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={false}
        disableFlipByClick={false}
        onFlip={(e: any) => onFlip(e.data)}
      >
        {pageElements}
      </HTMLFlipBook>
    </div>
  )
})
FlipBookInner.displayName = 'FlipBookInner'

export default function ManualFlipbookViewer({ pages, onPlayVideo, className = '' }: ManualFlipbookViewerProps) {
  const book = useRef<any>(null)
  const stageContainerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isMobileScreen, setIsMobileScreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [coverFlipStarted, setCoverFlipStarted] = useState(false)
  const [coverCloseStarted, setCoverCloseStarted] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [scale, setScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const totalPages = pages.length + (pages.length % 2 !== 0 ? 1 : 0)

  // Stable key for HTMLFlipBook to force remount when pages change
  const flipbookKey = useMemo(() => pages.map(p => p.id).join('-'), [pages])

  // Memoize page elements to prevent react-pageflip DOM conflicts
  const pageElements = useMemo(() => {
    const elements: React.ReactNode[] = []

    pages.forEach((page, index) => {
      // Add decorative blank page right before back cover (last page)
      if (index === pages.length - 1 && pages.length > 1) {
        elements.push(<BlankPage key="blank-before-backcover" />)
      }

      elements.push(
        <Page key={page.id || index} page={page} onPlay={onPlayVideo} />
      )
      // Add decorative blank page right after cover (first page)
      if (index === 0) {
        elements.push(<BlankPage key="blank-after-cover" />)
      }
    })

    // Add blank page at end if needed for even total
    if (elements.length % 2 !== 0) {
      elements.push(<BlankPage key="blank-end" />)
    }

    return elements
  }, [pages, onPlayVideo])

  // Use refs for sound to keep handleFlip completely stable
  const flipSoundRef = useRef<HTMLAudioElement | null>(null)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const pointerDownRef = useRef<{ x: number; y: number; mode: 'open' | 'close' } | null>(null)
  const revertShiftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const DRAG_THRESHOLD_PX = 10

  // Completely stable callback - no deps that change
  const handleFlip = useCallback((pageNum: number) => {
    if (revertShiftTimeoutRef.current) {
      clearTimeout(revertShiftTimeoutRef.current)
      revertShiftTimeoutRef.current = null
    }
    setCurrentPage(pageNum)
    setCoverFlipStarted(false)
    setCoverCloseStarted(false)
    // Saat kembali ke cover: paksa redraw setelah animasi selesai agar halaman kiri kosong (smooth seperti flip lain)
    if (pageNum === 0) {
      const flip = book.current?.pageFlip()
      if (flip) {
        const doUpdate = () => flip.update()
        requestAnimationFrame(() => requestAnimationFrame(doUpdate))
        setTimeout(doUpdate, 1200)
      }
    }
    // Play sound using ref (no dependency on soundEnabled state)
    if (soundEnabledRef.current) {
      try {
        if (!flipSoundRef.current) {
          flipSoundRef.current = new Audio('/sounds/page-flip.mp3')
          flipSoundRef.current.volume = 0.5
        }
        flipSoundRef.current.currentTime = 0
        flipSoundRef.current.play().catch(() => { })
      } catch { }
    }
  }, [])

  // Geser barengan dengan buka/tutup: mulai geser saat pointer down (bukan setelah drag)
  const handleStagePointerDown = useCallback((e: React.PointerEvent) => {
    if (currentPage === 0) {
      if (revertShiftTimeoutRef.current) {
        clearTimeout(revertShiftTimeoutRef.current)
        revertShiftTimeoutRef.current = null
      }
      setCoverFlipStarted(true)
      pointerDownRef.current = { x: e.clientX, y: e.clientY, mode: 'open' }
    } else if (currentPage === 1) {
      setCoverCloseStarted(true)
      pointerDownRef.current = { x: e.clientX, y: e.clientY, mode: 'close' }
    } else return
    const onMove = () => {}
    const onUp = () => {
      if (pointerDownRef.current?.mode === 'open') {
        revertShiftTimeoutRef.current = setTimeout(() => setCoverFlipStarted(false), 1100)
      }
      pointerDownRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [currentPage])

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Small delay to prevent layout shift/glitch on initial render
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 300)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [pages])

  // Scale book stage to fill available area (full layar)
  const updateScale = useCallback(() => {
    const container = stageContainerRef.current
    if (!container) return
    const r = container.getBoundingClientRect()
    const w = r.width
    const h = r.height
    if (w <= 0 || h <= 0) return
    const s = Math.min(w / BOOK_STAGE_WIDTH, h / BOOK_STAGE_HEIGHT)
    setScale(s)
  }, [])

  useEffect(() => {
    if (!isReady || !pages?.length) return
    const t = setTimeout(updateScale, 100)
    window.addEventListener('resize', updateScale)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', updateScale)
    }
  }, [isReady, pages?.length, updateScale])

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  const updateScaleRef = useRef(updateScale)
  updateScaleRef.current = updateScale
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => updateScaleRef.current(), 100)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  if (!pages || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[32px] border-4 border-slate-900 border-dashed text-slate-400 h-full w-full">
        <Play className="w-16 h-16 mb-4 opacity-20" strokeWidth={3} />
        <p className="text-xs font-black uppercase tracking-[0.2em]">Belum ada halaman yang diunggah.</p>
      </div>
    )
  }

  // Nomor halaman buku: cover = 1, halaman kosong setelah cover = 2, lalu 3, 4, ... (index + 1)
  let displayPages: number[] = []
  if (isMobileScreen) {
    displayPages.push(currentPage + 1)
  } else {
    if (currentPage === 0) {
      displayPages.push(1)
    } else {
      displayPages.push(currentPage + 1, currentPage + 2)
    }
  }
  const pageText = displayPages.length > 0 ? `HAL ${displayPages.join(' - ')}` : 'HAL -'
  const isCoverOnly = (currentPage === 0 && !coverFlipStarted) || (currentPage === 1 && coverCloseStarted)

  return (
    <div
      ref={wrapperRef}
      className={`flip-book-wrapper flex flex-col w-full h-full ${className} transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${isCoverOnly ? 'flip-book-wrapper--cover-only' : ''} ${isFullscreen ? 'flip-book-wrapper--fullscreen' : ''}`}
    >
      <div
        ref={stageContainerRef}
        className="relative flex-1 min-h-0 w-full flex items-center justify-center p-0 overflow-hidden"
        onPointerDown={handleStagePointerDown}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: BOOK_STAGE_WIDTH,
            height: BOOK_STAGE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <FlipBookInner
            flipbookKey={flipbookKey}
            pageElements={pageElements}
            isMobileScreen={isMobileScreen}
            bookRef={book}
            onFlip={handleFlip}
            stageWidth={BOOK_STAGE_WIDTH}
            stageHeight={BOOK_STAGE_HEIGHT}
          />
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="shrink-0 w-full flex items-center justify-center gap-3 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white border-t-2 border-slate-900 shadow-[0_-2px_0_0_rgba(15,23,42,0.1)] z-50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (currentPage === 1) setCoverCloseStarted(true)
            book.current?.pageFlip()?.flipPrev()
          }}
          disabled={currentPage === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-200 border-2 border-slate-900 disabled:opacity-50 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={3} />
        </button>

        <div className="flex flex-col items-center justify-center min-w-[64px]">
          <span className="font-black text-slate-900 text-xs sm:text-sm tracking-widest uppercase">{pageText}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (currentPage === 0) {
              flushSync(() => setCoverFlipStarted(true))
            }
            book.current?.pageFlip()?.flipNext()
          }}
          disabled={currentPage >= totalPages - (isMobileScreen ? 1 : 2)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-200 border-2 border-slate-900 disabled:opacity-50 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={3} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a]"
          title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" strokeWidth={2.5} /> : <VolumeX className="w-4 h-4" strokeWidth={2.5} />}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="w-8 h-8 ml-auto flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a]"
          title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" strokeWidth={2.5} /> : <Maximize2 className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  )
}

function Hotspot({ h, onPlay }: { h: VideoHotspot, onPlay?: (url: string) => void }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onPlay?.(h.video_url)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="absolute cursor-pointer z-[100] group/hotspot transition-all"
      style={{
        left: `${h.x}%`,
        top: `${h.y}%`,
        width: `${h.width}%`,
        height: `${h.height}%`,
      }}
    >
      <div className="absolute inset-0 border-4 border-transparent group-hover/hotspot:border-amber-400 group-hover/hotspot:bg-amber-400/10 transition-all rounded-sm">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-indigo-400 border-2 border-slate-900 rounded-xl text-white opacity-0 group-hover/hotspot:opacity-100 shadow-[2px_2px_0_0_#0f172a] transition-all">
          <Play className="w-4 h-4 fill-current" />
        </div>
      </div>
    </div>
  )
}
