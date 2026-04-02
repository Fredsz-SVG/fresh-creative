import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import HTMLFlipBook from 'react-pageflip'
import { Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize2, Minimize2, FlipHorizontal2, Share2, Copy, X } from 'lucide-react'
import { toast } from 'sonner'

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
  albumId?: string
  /** true = dipakai di halaman editor user (navbar lebih kecil & jarak longgar agar tidak mepet) */
  isEditorView?: boolean
  /** Dipakai parent saat panel preview hide/show agar ukuran flipbook selalu tersinkron. */
  isVisible?: boolean
}

/* Efek tekukan buku (spine): garis vertikal + lekukan 3D di tepi jilid */
const SpineFoldEffect = ({ side }: { side: 'left' | 'right' }) => (
  <div
    className={`absolute inset-y-0 w-[5%] max-w-[24px] z-10 pointer-events-none page-spine-fold page-spine-fold--${side} ${side === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'}`}
    aria-hidden
  />
)

/* Garis tekukan (hinge crease) lurus khas buku hardcover tebal */
const HardcoverHinge = ({ side }: { side: 'left' | 'right' }) => (
  <div
    className={`absolute inset-y-0 w-[3px] z-30 pointer-events-none bg-black/40 ${side === 'left' ? 'left-[1%] sm:left-[12px]' : 'right-[1%] sm:right-[12px]'} shadow-[0.5px_0_0_rgba(255,255,255,0.4),0_0_5px_rgba(0,0,0,0.3)]`}
    aria-hidden
  />
)

/* Tepi ketebalan cover/back cover (seperti buku asli dilihat dari samping) */
const BookEdgeEffect = ({ side }: { side: 'left' | 'right' }) => (
  <>
    {/* Main thickness edge */}
    <div
      className={`absolute inset-y-0 w-[2.2%] max-w-[12px] z-20 pointer-events-none book-edge book-edge--${side} ${side === 'right' ? 'right-0' : 'left-0'}`}
      aria-hidden
    />
    {/* Highlights for the very edge to give it a sharp corner look */}
    <div
      className={`absolute inset-y-0 w-[0.5%] max-w-[2px] z-30 pointer-events-none bg-white/20 ${side === 'right' ? 'right-0' : 'left-0'}`}
      aria-hidden
    />
  </>
)

const Page = React.memo(React.forwardRef<HTMLDivElement, {
  page: ManualFlipbookPage
  onPlay?: (url: string) => void
  isCover?: boolean
  isBackCover?: boolean
}>((props, ref) => (
  <div
    className={`page-content bg-white h-full w-full relative overflow-hidden transition-shadow duration-300 ${props.isCover ? 'page-content--cover ring-2 ring-black/10' : ''} ${props.isBackCover ? 'page-content--back-cover ring-2 ring-black/10' : ''}`}
    style={{ backfaceVisibility: 'hidden', backgroundColor: 'white' }}
    ref={ref}
  >
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
          <SpineFoldEffect side="left" />
          <HardcoverHinge side="left" />
          <BookEdgeEffect side="right" />
        </>
      )}
      {props.isBackCover && (
        <>
          <SpineFoldEffect side="right" />
          <HardcoverHinge side="right" />
          <BookEdgeEffect side="left" />
        </>
      )}
    </div>
  </div>
)))
Page.displayName = 'Page'

// Decorative blank page (forwardRef required by react-pageflip) — putih ke abu-abuan tebal
const BLANK_PAGE_STYLE = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)',
  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.05)'
}
const BlankPage = React.memo(React.forwardRef<HTMLDivElement>(function BlankPage(_, ref) {
  return (
    <div ref={ref} data-blank-page className="page-content blank-page-content h-full w-full relative overflow-hidden border-2 border-slate-300" style={BLANK_PAGE_STYLE}>
      <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-slate-400/40 rounded-tl-md" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-slate-400/40 rounded-tr-md" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-slate-400/40 rounded-bl-md" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-slate-400/40 rounded-br-md" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-4 opacity-40">
          <div className="w-16 h-px bg-slate-600" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
          <div className="w-16 h-px bg-slate-600" />
        </div>
      </div>
      {/* Subtle paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
    </div>
  )
}))
BlankPage.displayName = 'BlankPage'

// Ukuran "stage" buku (library render di sini, lalu di-scale ke layar)
const BOOK_STAGE_WIDTH = 1400
const BOOK_STAGE_HEIGHT = 900
// Mobile: satu halaman portrait agar usePortrait aktif (blockWidth < pageWidth*2)
const MOBILE_STAGE_WIDTH = 400
const MOBILE_STAGE_HEIGHT = 600

const FlipBookInner = React.memo(({ flipbookKey, pageElements, isMobileScreen, bookRef, onFlip, triggerPrevWithAnimationRef, stageWidth, stageHeight, isCoverOnly, isBackCoverOnly, startPage }: {
  flipbookKey: string
  pageElements: React.ReactNode[]
  isMobileScreen: boolean
  bookRef: React.RefObject<any>
  onFlip: (pageNum: number) => void
  triggerPrevWithAnimationRef?: React.MutableRefObject<(() => void) | null>
  stageWidth: number
  stageHeight: number
  isCoverOnly: boolean
  isBackCoverOnly: boolean
  startPage: number
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Di mobile, prev dengan animasi flip: panggil flip(pos) dengan posisi sudut kiri buku (block-relative).
  // Library pakai disableFlipByClick=true jadi flip() hanya jalan kalau isPointOnCorners(pos) true.
  useEffect(() => {
    if (!triggerPrevWithAnimationRef || !isMobileScreen) return
    triggerPrevWithAnimationRef.current = () => {
      const api = bookRef.current?.pageFlip()
      const controller = api?.getFlipController?.()
      if (!api || !controller?.flip) return
      const rect = api.getBoundsRect?.() ?? api.getRender?.()?.getRect?.()
      if (!rect) return
      // Posisi block-relative agar convertToBook jadi kiri buku; operatingDistance ~ width/5
      const margin = Math.min(rect.pageWidth, rect.height) / 5
      const leftX = rect.left + margin
      const topY = rect.top + margin
      controller.flip({ x: leftX, y: topY })
    }
    return () => { triggerPrevWithAnimationRef.current = null }
  }, [triggerPrevWithAnimationRef, isMobileScreen, flipbookKey])

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

  // Track pointer movement to distinguish between click and swipe
  const startPos = useRef<{ x: number, y: number, side: 'left' | 'right' | null } | null>(null)
  const hasMoved = useRef(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const relX = x / rect.width

    // Penentuan sisi secara absolut terhadap panggung 1400px
    const side = relX < 0.5 ? 'left' : 'right'

    startPos.current = { x: e.clientX, y: e.clientY, side }
    hasMoved.current = false
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx > 10 || dy > 10) {
      hasMoved.current = true
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPos.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y

    // Swipe detection: Minimal movement for responsiveness
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      const flip = bookRef.current?.pageFlip()
      if (flip) {
        // Logika Sisi: 
        // - Jika mulai di sisi kanan panggung dan swipe ke kiri -> Next
        // - Jika mulai di sisi kiri panggung dan swipe ke kanan -> Prev
        if (startPos.current.side === 'right' && dx < -20) {
          flip.flipNext()
        } else if (startPos.current.side === 'left' && dx > 20) {
          if (isMobileScreen && triggerPrevWithAnimationRef?.current) triggerPrevWithAnimationRef.current()
          else flip.flipPrev()
        }
      }
    }
    startPos.current = null
  }

  const handleClickCapture = (e: React.MouseEvent) => {
    // Jika ada pergerakan (swipe), blokir klik agar tidak mengganggu navigasi manual
    if (hasMoved.current) {
      e.stopPropagation()
      e.preventDefault()
    }
    startPos.current = null
  }

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 flex justify-center"
      style={{ width: stageWidth, height: stageHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { startPos.current = null }}
      onClickCapture={handleClickCapture}
    >
      {/* @ts-ignore - key dengan isMobileScreen agar remount saat Inspect ganti device (library dapat ukuran baru) */}
      <HTMLFlipBook
        key={`${flipbookKey}-${isMobileScreen ? 'm' : 'd'}`}
        width={isMobileScreen ? stageWidth : stageWidth / 2}
        height={stageHeight}
        size="fixed"
        minWidth={isMobileScreen ? stageWidth : stageWidth / 2}
        maxWidth={isMobileScreen ? stageWidth : stageWidth / 2}
        minHeight={stageHeight}
        maxHeight={stageHeight}
        maxShadowOpacity={0.4}
        showCover={true}
        mobileScrollSupport={false}
        className="demo-book"
        ref={bookRef}
        startPage={startPage}
        drawShadow={true}
        flippingTime={600}
        usePortrait={isMobileScreen}
        startZIndex={0}
        autoSize={true}
        clickEventForward={true}
        useMouseEvents={false}
        swipeDistance={9999}
        showPageCorners={false}
        disableFlipByClick={!isMobileScreen}
        onFlip={(e: any) => onFlip(e.data)}
      >
        {pageElements}
      </HTMLFlipBook>
    </div>
  )
})
FlipBookInner.displayName = 'FlipBookInner'

export default function ManualFlipbookViewer({ pages, onPlayVideo, className = '', albumId, isEditorView = false, isVisible = true }: ManualFlipbookViewerProps) {
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
  const [sectionFlipDir, setSectionFlipDir] = useState<'next' | 'prev' | null>(null)
  const [showSharePopup, setShowSharePopup] = useState(false)

  const isMobileScreenRef = useRef(isMobileScreen)
  isMobileScreenRef.current = isMobileScreen
  const stageWidth = isMobileScreen ? MOBILE_STAGE_WIDTH : BOOK_STAGE_WIDTH
  const stageHeight = isMobileScreen ? MOBILE_STAGE_HEIGHT : BOOK_STAGE_HEIGHT

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
          flipSoundRef.current.play().catch(() => { })
        }
      } catch { }
    }
  }, [])

  // Interaction controlled by swipe only, removing background click listeners
  const handleStagePointerDown = useCallback(() => { }, [])

  const MOBILE_BREAKPOINT = 768
  const checkMobile = useCallback(() => setIsMobileScreen(window.innerWidth < MOBILE_BREAKPOINT), [])

  useEffect(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
    const readyTimer = setTimeout(() => setIsReady(true), READY_DELAY_MS)
    return () => {
      clearTimeout(readyTimer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [pages, checkMobile])

  // Saat Inspect → toggle device: matchMedia, visualViewport, ResizeObserver, + poll fallback
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onMediaChange = (e: MediaQueryListEvent) => setIsMobileScreen(e.matches)
    mq.addEventListener('change', onMediaChange)
    return () => mq.removeEventListener('change', onMediaChange)
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onViewportResize = () => {
      const w = vv.width
      setIsMobileScreen((prev) => {
        const next = w < MOBILE_BREAKPOINT
        return prev !== next ? next : prev
      })
    }
    vv.addEventListener('resize', onViewportResize)
    vv.addEventListener('scroll', onViewportResize)
    return () => {
      vv.removeEventListener('resize', onViewportResize)
      vv.removeEventListener('scroll', onViewportResize)
    }
  }, [])

  useEffect(() => {
    const el = stageContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobileScreen((prev) => (prev !== mobile ? mobile : prev))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isReady])

  // Fallback: poll innerWidth saat tab visible (tangkap saat Inspect ganti device yang tidak emit event)
  useEffect(() => {
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 0
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      const w = window.innerWidth
      if (w === lastWidth) return
      lastWidth = w
      setIsMobileScreen((prev) => {
        const next = w < MOBILE_BREAKPOINT
        return prev !== next ? next : prev
      })
    }, 400)
    return () => clearInterval(id)
  }, [])

  // Setelah ukuran/orientasi berubah (mobile ↔ desktop), paksa library recalc portrait/landscape
  useEffect(() => {
    if (!isReady || !pages?.length) return
    const t = setTimeout(() => {
      book.current?.pageFlip()?.update()
    }, RESIZE_THROTTLE_MS + 50)
    return () => clearTimeout(t)
  }, [isMobileScreen, isReady, pages?.length])

  // Saat panel preview baru terlihat, paksa recalc layout untuk cegah blank first-render.
  useEffect(() => {
    if (!isVisible || !isReady || !pages?.length) return
    const t1 = setTimeout(() => {
      updateScaleRef.current()
      book.current?.pageFlip()?.update()
    }, 0)
    const t2 = setTimeout(() => {
      updateScaleRef.current()
      book.current?.pageFlip()?.update()
    }, 120)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isVisible, isReady, pages?.length])

  const updateScale = useCallback(() => {
    const container = stageContainerRef.current
    if (!container) return
    const { width: w, height: h } = container.getBoundingClientRect()
    if (w <= 0 || h <= 0) return

    const mobile = isMobileScreenRef.current
    const stageW = mobile ? MOBILE_STAGE_WIDTH : BOOK_STAGE_WIDTH
    const stageH = mobile ? MOBILE_STAGE_HEIGHT : BOOK_STAGE_HEIGHT
    const paddingX = mobile ? 16 : 32
    const paddingY = mobile ? 24 : 48

    setScale(Math.min(Math.max((w - paddingX) / stageW, 0), Math.max((h - paddingY) / stageH, 0)))
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
  }, [isReady, pages?.length, updateScale, isMobileScreen])

  useEffect(() => {
    const wrapperEl = wrapperRef.current
    const stageEl = stageContainerRef.current
    if (!wrapperEl || !stageEl || typeof ResizeObserver === 'undefined') return

    let rafId: number | null = null
    const syncLayout = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        updateScale()
        book.current?.pageFlip()?.update()
      })
    }

    const ro = new ResizeObserver(() => {
      syncLayout()
    })

    ro.observe(wrapperEl)
    ro.observe(stageEl)

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [updateScale, flipbookKey, isMobileScreen])

  // Refined Logic: isCoverOnly and isBackCoverOnly for Layout Centering
  const isCoverOnly = (currentPage === 0 && !coverFlipStarted) || (currentPage === 1 && coverCloseStarted) || coverJustClosed
  const isBackCoverOnly = currentPage >= totalPageCount - 2

  const handleToggleCover = useCallback(() => {
    if (sectionFlipDir) return // Guard terhadap klik berkali-kali

    const lastPage = Math.max(0, totalPageCount - 1)
    const target = isBackCoverOnly ? 0 : lastPage
    const flip = book.current?.pageFlip()
    if (!flip) return
    if (flip.getCurrentPageIndex?.() === target) return

    // Mulai animasi putar 180 (single flip)
    const dir = isBackCoverOnly ? 'prev' : 'next'
    setSectionFlipDir(dir)

    // Tepat di tengah animasi (saat buku 90-derajat / tak terlihat)
    setTimeout(() => {
      // Ganti state halaman tanpa re-render berlebihan
      flip.turnToPage(target)
      setCurrentPage(target)
      setCoverFlipStarted(false)
      setCoverCloseStarted(false)
      setCoverJustClosed(target === 0)

      if (target === 0 || target === 1) {
        requestAnimationFrame(() => requestAnimationFrame(() => flip.update()))
      }
    }, 400) // Tepat di 50% dari 0.8s CSS animation

    // Selesai animasi
    setTimeout(() => {
      setSectionFlipDir(null)
    }, 800)
  }, [totalPageCount, isBackCoverOnly, sectionFlipDir])
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

  // Ref untuk trigger prev dengan animasi flip (mobile: flip di posisi kiri buku)
  const triggerPrevWithAnimationRef = useRef<(() => void) | null>(null)

  const handlePrev = useCallback(() => {
    if (currentPage === 0) return
    const flip = book.current?.pageFlip()
    if (!flip) return
    if (isMobileScreen) {
      triggerPrevWithAnimationRef.current?.()
    } else {
      flip.flipPrev()
    }
  }, [currentPage, isMobileScreen])

  const handlePageInputSubmit = useCallback(() => {
    const num = parseInt(pageInputValue.trim(), 10)
    if (!Number.isNaN(num)) goToPage(num)
    else setShowPageInput(false)
  }, [pageInputValue, goToPage])

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { })
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { })
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
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-[32px] border-4 border-slate-900 dark:border-slate-700 border-dashed text-slate-400 dark:text-slate-500 h-full w-full">
        <Play className="w-16 h-16 mb-4 opacity-20" strokeWidth={3} />
        <p className="text-xs font-black uppercase tracking-[0.2em]">Belum ada halaman yang diunggah.</p>
      </div>
    )
  }

  // Nomor halaman urut 1..N: HAL 1 = cover, 2 = kosong, 3..95 = isi, 96 = back. 94 page + 2 kosong = 96.
  // Library kirim indeks halaman kiri (0..N-1). Spread kiri=i → buku [i+1, i+2]. Jadi [currentPage+1, currentPage+2].
  const displayPages: number[] = (() => {
    const N = totalPageCount
    if (N <= 0) return []
    const clamp = (p: number) => Math.max(1, Math.min(N, p))

    if (currentPage === 0) {
      return isCoverOnly || isMobileScreen ? [1] : [2]
    }
    // Spread terakhir (blank + back cover): tampilkan hanya HAL N (sama seperti cover hanya HAL 1)
    if (currentPage === N - 1 || currentPage === N - 2) return [N]

    let raw: number[]
    if (isMobileScreen) {
      raw = [currentPage + 1]
    } else {
      raw = [currentPage + 1, currentPage + 2]
    }
    if (raw.some(p => p > N)) return [N]
    return raw.map(clamp)
  })()
  const pageText = displayPages.length > 0 ? displayPages.join(' - ') : '-'


  return (
    <div
      ref={wrapperRef}
      className={`flip-book-wrapper relative overflow-hidden flex flex-col w-full h-full min-h-0 bg-white dark:bg-slate-950 pb-[calc(2.75rem+env(safe-area-inset-bottom))] md:pb-0 ${className} transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${isCoverOnly ? 'flip-book-wrapper--cover-only' : ''} ${isBackCoverOnly ? 'flip-book-wrapper--back-cover-only' : ''} ${isFullscreen ? 'flip-book-wrapper--fullscreen' : ''} ${sectionFlipDir ? `is-flipping-${sectionFlipDir}` : ''}`}
    >
      <div
        ref={stageContainerRef}
        className={`relative flex-1 min-h-0 w-full flex items-center justify-center overflow-visible ${isMobileScreen ? 'p-2' : 'p-4'}`}
        onPointerDown={handleStagePointerDown}
      >
        <div
          className="flip-book-stage"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: stageWidth,
            height: stageHeight,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
            perspective: '1500px',
          }}
        >
          <div
            className={`flip-book-3d-rotator ${sectionFlipDir ? `is-flipping-${sectionFlipDir}` : ''}`}
            style={{
              willChange: sectionFlipDir ? 'transform' : 'auto',
              transformStyle: 'preserve-3d'
            }}
          >


            {/* Shifter: mobile satu halaman selalu tengah; desktop geser untuk cover/back cover */}
            <div
              style={{
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                transform: isMobileScreen ? 'translateX(0)' : (isCoverOnly ? 'translateX(-25%)' : (isBackCoverOnly ? 'translateX(25%)' : 'translateX(0)')),
                transition: sectionFlipDir ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
              }}
            >
              {/* Thickness Layers: Berada di dalam shifter agar lebarnya selaras dengan buku */}
              {sectionFlipDir && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: 0,
                    width: (isCoverOnly || isBackCoverOnly) ? '50.1%' : '100.1%',
                    left: isCoverOnly ? '49.9%' : '0',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className="absolute inset-0 bg-paper-stack rounded-[2px]" style={{ transform: 'translateZ(-8px)' }} />
                  <div className="absolute inset-0 bg-paper-stack rounded-[2px]" style={{ transform: 'translateZ(-16px)' }} />
                  <div className="absolute inset-0 bg-slate-300 rounded-[2px]" style={{ transform: 'translateZ(-24px)', border: '1px solid rgba(0,0,0,0.1)' }} />
                </div>
              )}

              <FlipBookInner
                flipbookKey={flipbookKey}
                pageElements={pageElements}
                isMobileScreen={isMobileScreen}
                bookRef={book}
                onFlip={handleFlip}
                triggerPrevWithAnimationRef={triggerPrevWithAnimationRef}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                isCoverOnly={isCoverOnly}
                isBackCoverOnly={isBackCoverOnly}
                startPage={currentPage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar — editor: tombol lebih kecil + jarak longgar; public: tetap */}
      <div className={`mt-auto shrink-0 w-full flex items-center bg-white dark:bg-slate-900 border-t border-slate-900 dark:border-slate-700 shadow-[0_-1px_0_0_rgba(15,23,42,0.06)] dark:shadow-[0_-1px_0_0_rgba(51,65,85,0.4)] z-50 md:sticky md:bottom-0 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:pb-[env(safe-area-inset-bottom)] ${isEditorView ? 'px-2 py-1' : 'px-1.5 py-0.5'}`}>
        {/* Kiri: sound + flip */}
        <div className={`flex-1 flex items-center justify-start ${isEditorView ? 'gap-1.5' : 'gap-0.5'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
            className={`p-0 flex items-center justify-center rounded-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-900 dark:border-slate-600 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
            style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
            title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {soundEnabled ? <Volume2 className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} /> : <VolumeX className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleCover(); }}
            className={`p-0 flex items-center justify-center rounded-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-900 dark:border-slate-600 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
            style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
            title={isBackCoverOnly ? 'Ke cover depan' : 'Ke back cover'}
          >
            <FlipHorizontal2 className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tengah: Prev + nomor halaman + Next */}
        <div className={`flex items-center justify-center shrink-0 ${isEditorView ? 'gap-2' : 'gap-1'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            disabled={currentPage === 0}
            className={`p-0 flex items-center justify-center rounded-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 border border-slate-900 dark:border-slate-600 disabled:opacity-50 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5 touch-manipulation ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
            style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
          >
            <ChevronLeft className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={3} />
          </button>
          <div
            className={`flex flex-col items-center justify-center cursor-pointer rounded-sm border border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isEditorView ? 'w-16 min-w-16 h-[28px]' : 'w-16 min-w-16 h-[28px]'}`}
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
                className={`w-full text-center font-bold text-slate-900 dark:text-white tracking-widest bg-transparent border-none outline-none focus:ring-0 p-0 min-h-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isEditorView ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'}`}
                autoFocus
              />
            ) : (
              <span className={`font-bold text-slate-900 dark:text-white tracking-widest uppercase leading-none ${isEditorView ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'}`}>{pageText}</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (currentPage === 0) flushSync(() => { setCoverFlipStarted(true); setCoverJustClosed(false) })
              book.current?.pageFlip()?.flipNext()
            }}
            disabled={currentPage >= totalPageCount - (isMobileScreen ? 1 : 2)}
            className={`p-0 flex items-center justify-center rounded-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 border border-slate-900 dark:border-slate-600 disabled:opacity-50 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] disabled:shadow-none disabled:translate-x-0.5 disabled:translate-y-0.5 ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
            style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
          >
            <ChevronRight className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={3} />
          </button>
        </div>

        {/* Kanan: share + fullscreen */}
        <div className={`flex-1 flex items-center justify-end ${isEditorView ? 'gap-1.5' : 'gap-1'}`}>
{albumId && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSharePopup(true); }}
                className={`p-0 flex items-center justify-center rounded-sm bg-emerald-400 dark:bg-emerald-600 hover:bg-emerald-300 dark:hover:bg-emerald-500 border border-slate-900 dark:border-slate-600 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
                style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
                title="Bagikan"
              >
                <Share2 className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} />
              </button>
              {showSharePopup && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
                  onClick={(e) => { e.stopPropagation(); setShowSharePopup(false); }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="share-popup-title"
                >
                  <div
                    className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-xl shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] max-w-sm w-full p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 id="share-popup-title" className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Bagikan flipbook</h3>
                      <button
                        type="button"
                        onClick={() => setShowSharePopup(false)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                        aria-label="Tutup"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 break-all">
                      {typeof window !== 'undefined' && `${window.location.origin}/album/${albumId}/flipbook`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/album/${albumId}/flipbook`;
                          navigator.clipboard.writeText(url);
                          toast.success('Link disalin ke clipboard');
                          setShowSharePopup(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] transition-all"
                      >
                        <Copy className="w-4 h-4 shrink-0" />
                        Salin link
                      </button>
                      {typeof navigator !== 'undefined' && navigator.share && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/album/${albumId}/flipbook`;
                            navigator.share({
                              title: 'Flipbook Yearbook',
                              text: 'Check out my yearbook flipbook!',
                              url,
                            }).then(() => setShowSharePopup(false)).catch(() => {})
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-400 dark:bg-emerald-600 hover:bg-emerald-300 dark:hover:bg-emerald-500 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide active:scale-[0.98] shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] transition-all"
                        >
                          <Share2 className="w-4 h-4 shrink-0" />
                          Bagikan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className={`p-0 flex items-center justify-center rounded-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-900 dark:border-slate-600 transition-all text-slate-900 dark:text-white active:scale-95 shadow-[1px_1px_0_0_#0f172a] dark:shadow-[1px_1px_0_0_#334155] ${isEditorView ? '!size-[28px] !min-w-[28px] !min-h-[28px]' : 'size-[28px] min-w-[28px] min-h-[28px]'}`}
            style={isEditorView ? { width: 28, height: 28, minWidth: 28, minHeight: 28 } : undefined}
            title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} /> : <Maximize2 className={`shrink-0 ${isEditorView ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} strokeWidth={2.5} />}
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
