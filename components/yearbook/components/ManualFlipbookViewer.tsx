import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import HTMLFlipBook from 'react-pageflip'
import { Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize2, Minimize2, FlipHorizontal2 } from 'lucide-react'

const RESIZE_THROTTLE_MS = 150
const FLIP_UPDATE_DELAY_MS = 1200
const READY_DELAY_MS = 120
/* Durasi flip 600ms seperti turn.js agar terasa mulus seperti referensi */

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

/* Efek tekukan buku (spine): garis vertikal + lekukan 3D di tepi jilid */
const SpineFoldEffect = ({ side }: { side: 'left' | 'right' }) => (
  <div
    className={`absolute inset-y-0 w-[3%] max-w-[14px] z-10 pointer-events-none page-spine-fold page-spine-fold--${side} ${side === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'}`}
    aria-hidden
  />
)

/* Tepi ketebalan cover/back cover (seperti buku asli dilihat dari samping) */
const BookEdgeEffect = ({ side }: { side: 'left' | 'right' }) => (
  <div
    className={`absolute inset-y-0 w-[1.2%] max-w-[6px] z-20 pointer-events-none book-edge book-edge--${side} ${side === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'}`}
    aria-hidden
  />
)

const Page = React.memo(React.forwardRef<HTMLDivElement, {
  page: ManualFlipbookPage
  onPlay?: (url: string) => void
  isCover?: boolean
  isBackCover?: boolean
}>((props, ref) => (
  <div className={`page-content bg-white h-full w-full relative overflow-hidden shadow-none ${props.isCover ? 'page-content--cover' : ''} ${props.isBackCover ? 'page-content--back-cover' : ''}`} ref={ref}>
    <div className="w-full h-full relative">
      <img
        src={props.page.image_url}
        alt={`Page ${props.page.page_number}`}
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
        loading="lazy"
      />
      {props.page.flipbook_video_hotspots?.map(h => (
        <Hotspot key={h.id} h={h} onPlay={props.onPlay} />
      ))}
      {!props.isCover && !props.isBackCover && (
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none opacity-30 z-10" />
      )}
      {props.isCover && (
        <>
          <SpineFoldEffect side="right" />
          <BookEdgeEffect side="right" />
        </>
      )}
      {props.isBackCover && (
        <>
          <SpineFoldEffect side="left" />
          <BookEdgeEffect side="left" />
        </>
      )}
    </div>
  </div>
)))
Page.displayName = 'Page'

// Decorative blank page (forwardRef required by react-pageflip) — putih ke abu-abuan
const BLANK_PAGE_STYLE = { background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 70%, #e2e8f0 100%)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.04), inset 0 0 8px rgba(0,0,0,0.02)' }
const BlankPage = React.memo(React.forwardRef<HTMLDivElement>(function BlankPage(_, ref) {
  return (
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
  )
}))
BlankPage.displayName = 'BlankPage'

// Ukuran "stage" buku (library render di sini, lalu di-scale ke layar)
const BOOK_STAGE_WIDTH = 1400
const BOOK_STAGE_HEIGHT = 900

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
    const patch = (node: Node) => {
      if (patched.has(node)) return
      patched.add(node)
      const n = node as HTMLElement
      const origRC = n.removeChild?.bind(n)
      const origIB = n.insertBefore?.bind(n)
      if (origRC) n.removeChild = function <T extends Node>(child: T): T { try { return origRC(child) } catch { return child } } as typeof n.removeChild
      if (origIB) n.insertBefore = function <T extends Node>(newNode: T, ref: Node | null): T { try { return origIB(newNode, ref) } catch { return newNode } } as typeof n.insertBefore
    }
    patch(el)
    for (let i = 0; i < el.children.length; i++) patch(el.children[i])
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations)
        for (const node of m.addedNodes)
          if (node.nodeType === 1) {
            patch(node)
            for (let i = 0; i < (node as HTMLElement).children.length; i++) patch((node as HTMLElement).children[i])
          }
    })
    obs.observe(el, { childList: true, subtree: true })
    return () => obs.disconnect()
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
        mobileScrollSupport={false}
        className="demo-book"
        ref={bookRef}
        startPage={0}
        drawShadow={true}
        flippingTime={600}
        usePortrait={isMobileScreen}
        startZIndex={0}
        autoSize={true}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={0}
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onPlayVideoRef = useRef(onPlayVideo)
  const totalPageCountRef = useRef(0)
  onPlayVideoRef.current = onPlayVideo

  const [isReady, setIsReady] = useState(false)
  const [isMobileScreen, setIsMobileScreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [coverFlipStarted, setCoverFlipStarted] = useState(false)
  const [coverCloseStarted, setCoverCloseStarted] = useState(false)
  const [coverJustClosed, setCoverJustClosed] = useState(false) // paksa posisi tengah setelah tutup cover
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [scale, setScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPageInput, setShowPageInput] = useState(false)
  const [pageInputValue, setPageInputValue] = useState('')

  const flipbookKey = useMemo(() => pages.map(p => p.id).join('-'), [pages])

  const pageElements = useMemo(() => {
    const elements: React.ReactNode[] = []
    const play = (url: string) => onPlayVideoRef.current?.(url)
    pages.forEach((page, index) => {
      if (index === pages.length - 1 && pages.length > 1) elements.push(<BlankPage key="blank-before-backcover" />)
      elements.push(
        <Page
          key={page.id || index}
          page={page}
          onPlay={play}
          isCover={index === 0}
          isBackCover={index === pages.length - 1}
        />
      )
      if (index === 0) elements.push(<BlankPage key="blank-after-cover" />)
    })
    if (elements.length % 2 !== 0) elements.push(<BlankPage key="blank-end" />)
    return elements
  }, [pages])

  const totalPageCount = useMemo(() => {
    let n = 0
    pages.forEach((_, i) => {
      if (i === pages.length - 1 && pages.length > 1) n++
      n++
      if (i === 0) n++
    })
    if (n % 2 !== 0) n++
    return n
  }, [pages])
  totalPageCountRef.current = totalPageCount

  const flipSoundRef = useRef<HTMLAudioElement | null>(null)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const pointerDownRef = useRef<{ x: number; y: number; mode: 'open' | 'close' } | null>(null)
  const revertShiftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flipUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFlip = useCallback((pageNum: number) => {
    if (revertShiftTimeoutRef.current) {
      clearTimeout(revertShiftTimeoutRef.current)
      revertShiftTimeoutRef.current = null
    }
    if (flipUpdateTimeoutRef.current) {
      clearTimeout(flipUpdateTimeoutRef.current)
      flipUpdateTimeoutRef.current = null
    }
    setCurrentPage(pageNum)
    setCoverFlipStarted(false)
    setCoverCloseStarted(false)
    if (pageNum === 0) setCoverJustClosed(true)
    if (pageNum !== 0) setCoverJustClosed(false)
    if (pageNum === 0 || pageNum === 1) {
      const flip = book.current?.pageFlip()
      if (flip) {
        const doUpdate = () => flip.update()
        requestAnimationFrame(() => requestAnimationFrame(doUpdate))
        flipUpdateTimeoutRef.current = setTimeout(doUpdate, FLIP_UPDATE_DELAY_MS)
      }
    }
    if (soundEnabledRef.current) {
      try {
        if (!flipSoundRef.current) flipSoundRef.current = new Audio('/sounds/page-flip.mp3')
        if (flipSoundRef.current) {
          flipSoundRef.current.volume = 0.5
          flipSoundRef.current.currentTime = 0
          flipSoundRef.current.play().catch(() => {})
        }
      } catch {}
    }
  }, [])

  // Geser sekalian dengan buka cover (hanya sinkron visual; navigasi hanya lewat tombol)
  const handleStagePointerDown = useCallback((e: React.PointerEvent) => {
    if (currentPage === 0) {
      if (revertShiftTimeoutRef.current) {
        clearTimeout(revertShiftTimeoutRef.current)
        revertShiftTimeoutRef.current = null
      }
      flushSync(() => {
        setCoverFlipStarted(true)
        setCoverJustClosed(false)
      })
      pointerDownRef.current = { x: e.clientX, y: e.clientY, mode: 'open' }
    }
    const onUp = () => {
      if (pointerDownRef.current?.mode === 'open') {
        revertShiftTimeoutRef.current = setTimeout(() => setCoverFlipStarted(false), 1100)
      }
      pointerDownRef.current = null
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [currentPage])

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    const readyTimer = setTimeout(() => setIsReady(true), READY_DELAY_MS)
    return () => {
      clearTimeout(readyTimer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [pages])

  const updateScale = useCallback(() => {
    const container = stageContainerRef.current
    if (!container) return
    const { width: w, height: h } = container.getBoundingClientRect()
    if (w <= 0 || h <= 0) return
    setScale(Math.min(w / BOOK_STAGE_WIDTH, h / BOOK_STAGE_HEIGHT))
  }, [])

  useEffect(() => {
    if (!isReady || !pages?.length) return
    let throttleId: ReturnType<typeof setTimeout> | null = null
    const throttledUpdate = () => {
      if (throttleId) return
      throttleId = setTimeout(() => {
        throttleId = null
        updateScale()
      }, RESIZE_THROTTLE_MS)
    }
    requestAnimationFrame(() => updateScale())
    window.addEventListener('resize', throttledUpdate)
    return () => {
      if (throttleId) clearTimeout(throttleId)
      window.removeEventListener('resize', throttledUpdate)
    }
  }, [isReady, pages?.length, updateScale])

  const isAtBackCover = currentPage >= totalPageCount - (isMobileScreen ? 1 : 2)
  const handleToggleCover = useCallback(() => {
    const lastPage = Math.max(0, totalPageCount - 1)
    const target = isAtBackCover ? 0 : lastPage
    const flip = book.current?.pageFlip()
    if (!flip) return
    if (flip.getCurrentPageIndex?.() === target) return
    /* Instant jump seperti tombol First/Last di referensi (abankirenk) — tanpa animasi berantai */
    flip.turnToPage(target)
    setCurrentPage(target)
    setCoverFlipStarted(false)
    setCoverCloseStarted(false)
    if (target === 0) setCoverJustClosed(true)
    else setCoverJustClosed(false)
    if (target === 0 || target === 1) {
      requestAnimationFrame(() => requestAnimationFrame(() => flip.update()))
      flipUpdateTimeoutRef.current = setTimeout(() => flip.update(), FLIP_UPDATE_DELAY_MS)
    }
  }, [totalPageCount, isAtBackCover])
  const handleToggleCoverRef = useRef(handleToggleCover)
  handleToggleCoverRef.current = handleToggleCover

  const goToPage = useCallback((pageOneBased: number) => {
    const pageIndex = Math.max(0, Math.min(totalPageCount - 1, pageOneBased - 1))
    const flip = book.current?.pageFlip()
    if (!flip) return
    flip.turnToPage(pageIndex)
    setCurrentPage(pageIndex)
    setCoverFlipStarted(false)
    setCoverCloseStarted(false)
    setCoverJustClosed(pageIndex === 0)
    if (pageIndex === 0 || pageIndex === 1) {
      requestAnimationFrame(() => requestAnimationFrame(() => flip.update()))
      flipUpdateTimeoutRef.current = setTimeout(() => flip.update(), FLIP_UPDATE_DELAY_MS)
    }
    setShowPageInput(false)
  }, [totalPageCount])

  const handlePageInputSubmit = useCallback(() => {
    const num = parseInt(pageInputValue.trim(), 10)
    if (!Number.isNaN(num)) goToPage(num)
    else setShowPageInput(false)
  }, [pageInputValue, goToPage])

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
      setTimeout(() => updateScaleRef.current(), RESIZE_THROTTLE_MS)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    return () => {
      if (revertShiftTimeoutRef.current) clearTimeout(revertShiftTimeoutRef.current)
      if (flipUpdateTimeoutRef.current) clearTimeout(flipUpdateTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!coverJustClosed || currentPage !== 0) return
    const t = setTimeout(() => setCoverJustClosed(false), 600)
    return () => clearTimeout(t)
  }, [coverJustClosed, currentPage])

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
  const isCoverOnly = (currentPage === 0 && !coverFlipStarted) || (currentPage === 1 && coverCloseStarted) || coverJustClosed
  const isBackCoverOnly = isAtBackCover

  return (
    <div
      ref={wrapperRef}
      className={`flip-book-wrapper flex flex-col w-full h-full pt-[5mm] ${className} transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${isCoverOnly ? 'flip-book-wrapper--cover-only' : ''} ${isBackCoverOnly ? 'flip-book-wrapper--back-cover-only' : ''} ${isFullscreen ? 'flip-book-wrapper--fullscreen' : ''}`}
    >
      <div
        ref={stageContainerRef}
        className="relative flex-1 min-h-0 w-full flex items-center justify-center p-0 pb-[5mm] overflow-hidden"
        onPointerDown={handleStagePointerDown}
      >
        <div
          className="flip-book-stage"
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

      {/* Bottom Navigation Bar — tombol pindah halaman (Prev + HAL + Next) di tengah */}
      <div className="shrink-0 w-full mt-[5mm] flex items-center px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white border-t-2 border-slate-900 shadow-[0_-2px_0_0_rgba(15,23,42,0.1)] z-50">
        {/* Kiri: sound + flip */}
        <div className="flex-1 flex items-center justify-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a]"
            title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" strokeWidth={2.5} /> : <VolumeX className="w-4 h-4" strokeWidth={2.5} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleCover(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a]"
            title={isAtBackCover ? 'Ke cover depan' : 'Ke back cover'}
          >
            <FlipHorizontal2 className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Tengah: Prev + HAL + Next — lebar area halaman tetap agar panah tidak geser */}
        <div className="flex items-center justify-center gap-3 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (currentPage === 1) flushSync(() => setCoverCloseStarted(true))
              book.current?.pageFlip()?.flipPrev()
            }}
            disabled={currentPage === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-200 border-2 border-slate-900 disabled:opacity-50 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <div
            className="flex flex-col items-center justify-center w-[7.5rem] min-w-[7.5rem] h-8 cursor-pointer rounded-lg border-2 border-transparent hover:border-slate-300 hover:bg-slate-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setPageInputValue(String(currentPage + 1))
              setShowPageInput(true)
            }}
            title="Klik untuk loncat ke halaman"
          >
            {showPageInput ? (
              <input
                type="number"
                min={1}
                max={totalPageCount}
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') handlePageInputSubmit()
                  if (e.key === 'Escape') setShowPageInput(false)
                }}
                onBlur={handlePageInputSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-center font-black text-slate-900 text-xs sm:text-sm tracking-widest bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            ) : (
              <span className="font-black text-slate-900 text-xs sm:text-sm tracking-widest uppercase">{pageText}</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (currentPage === 0) flushSync(() => { setCoverFlipStarted(true); setCoverJustClosed(false) })
              book.current?.pageFlip()?.flipNext()
            }}
            disabled={currentPage >= totalPageCount - (isMobileScreen ? 1 : 2)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-200 border-2 border-slate-900 disabled:opacity-50 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        {/* Kanan: fullscreen */}
        <div className="flex-1 flex items-center justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 transition-all text-slate-900 active:scale-95 shadow-[1.5px_1.5px_0_0_#0f172a]"
            title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" strokeWidth={2.5} /> : <Maximize2 className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}

const Hotspot = React.memo(function Hotspot({ h, onPlay }: { h: VideoHotspot; onPlay?: (url: string) => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onPlay?.(h.video_url) }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="absolute cursor-pointer z-[100] group/hotspot transition-all"
      style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.width}%`, height: `${h.height}%` }}
    >
      <div className="absolute inset-0 border-4 border-transparent group-hover/hotspot:border-amber-400 group-hover/hotspot:bg-amber-400/10 transition-all rounded-sm">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-indigo-400 border-2 border-slate-900 rounded-xl text-white opacity-0 group-hover/hotspot:opacity-100 shadow-[2px_2px_0_0_#0f172a] transition-all">
          <Play className="w-4 h-4 fill-current" />
        </div>
      </div>
    </div>
  )
})
