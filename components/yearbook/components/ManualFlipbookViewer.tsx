// (Cancelling this edit to read file first)

import React, { useRef, useState, useEffect } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'

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
    <div className="page-content bg-white h-full w-full relative overflow-hidden shadow-lg border border-gray-100" ref={ref}>
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

        {/* Shadow Overlay for depth (optional, react-pageflip handles shadows somewhat) */}
        <div className="absolute inset-0 pointer-events-none shadow-inner" />
      </div>

      {props.page.page_number && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-mono">
          {props.page.page_number}
        </div>
      )}
    </div>
  )
})
Page.displayName = 'Page'

export default function ManualFlipbookViewer({ pages, onPlayVideo, className = '' }: ManualFlipbookViewerProps) {
  const book = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (pages) {
      setTotalPages(pages.length % 2 !== 0 ? pages.length + 1 : pages.length)
    }
    // Small delay to prevent layout shift/glitch on initial render
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [pages])

  if (!pages || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10 text-gray-500 h-full w-full">
        <p>Belum ada halaman yang diunggah.</p>
      </div>
    )
  }

  const nextButtonClick = () => {
    book.current?.pageFlip().flipNext()
  }

  const prevButtonClick = () => {
    book.current?.pageFlip().flipPrev()
  }

  const onFlip = (e: any) => {
    setCurrentPage(e.data)
  }

  return (
    <div className={`flip-book-wrapper relative flex flex-col items-center justify-center h-full w-full ${className}`}>
      {/* 
        Container constraints:
        react-pageflip needs a container to size itself if size="stretch".
        We set a max width/height to avoid it blowing up layout.
      */}
      <div className={`relative w-full h-full flex items-start justify-center pt-4 transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* @ts-ignore - types might be missing */}
        <HTMLFlipBook
          width={280}
          height={380}
          size="stretch"
          minWidth={200}
          maxWidth={350}
          minHeight={300}
          maxHeight={500}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          className="demo-book shadow-2xl"
          ref={book}
          onFlip={onFlip}
          startPage={0}
          drawShadow={true}
          flippingTime={1000}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          style={{}} // Ensure style prop is passed if needed
        >
          {pages.map((page, index) => (
            <Page key={page.id || index} page={page} onPlay={onPlayVideo} />
          ))}
          {/* Add blank page if odd number of pages to allow closing */}
          {pages.length % 2 !== 0 && (
            <div className="page-content bg-white h-full w-full relative overflow-hidden shadow-lg border border-gray-100"></div>
          )}
        </HTMLFlipBook>
      </div>

      {/* Navigation Controls */}


      <style jsx global>{`
        .demo-book {
          /* Additional styles if needed */
        }
      `}</style>
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
      className="absolute cursor-pointer z-[100]"
      style={{
        left: `${h.x}%`,
        top: `${h.y}%`,
        width: `${h.width}%`,
        height: `${h.height}%`,
      }}
    />
  )
}
