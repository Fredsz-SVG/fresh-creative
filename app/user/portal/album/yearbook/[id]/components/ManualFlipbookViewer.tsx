'use client'

import React, { useState, useEffect } from 'react'
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

export default function ManualFlipbookViewer({ pages, onPlayVideo, className = '' }: ManualFlipbookViewerProps) {
  // flippedCount tracks how many sheets (including cover) have been flipped to the left.
  const [flippedCount, setFlippedCount] = useState(0)
  // currentStep tracks individual page views for mobile (0-indexed page view)
  const [currentStep, setCurrentStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!pages || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10 text-gray-500">
        <p>Belum ada halaman yang diunggah.</p>
      </div>
    )
  }

  const totalPages = pages.length
  const totalSheets = Math.ceil(totalPages / 2)

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (isMobile) {
      if (currentStep < totalPages - 1) {
        const nextStep = currentStep + 1
        setCurrentStep(nextStep)
        // Update flippedCount based on step
        setFlippedCount(Math.ceil(nextStep / 2))
      }
    } else {
      if (flippedCount < totalSheets) {
        setFlippedCount(prev => prev + 1)
      }
    }
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (isMobile) {
      if (currentStep > 0) {
        const prevStep = currentStep - 1
        setCurrentStep(prevStep)
        setFlippedCount(Math.ceil(prevStep / 2))
      }
    } else {
      if (flippedCount > 0) {
        setFlippedCount(prev => prev - 1)
      }
    }
  }

  // Desktop check for "opened" state
  const isOpenedDesktop = flippedCount > 0
  // Mobile check for focus
  const isOddStepMobile = currentStep % 2 !== 0

  return (
    <div className={`flip-book-wrapper ${className}`}>
      {/* 
         On Desktop: shift when flippedCount > 0
         On Mobile: shift whenever currentStep is odd (1, 3, 5...) to show the left page 
      */}
      <div className={`flip-book ${(!isMobile && isOpenedDesktop) ? 'is-opened-desktop' : ''} ${(isMobile && isOddStepMobile) ? 'is-focus-left-mobile' : ''}`}>

        {/* THE SHEETS */}
        {Array.from({ length: totalSheets }).map((_, i) => {
          const sheetIndex = i
          const isSheetFlipped = flippedCount > sheetIndex

          const frontPage = pages[sheetIndex * 2]
          const backPage = pages[sheetIndex * 2 + 1]

          const zIndex = isSheetFlipped ? sheetIndex + 1 : totalSheets - sheetIndex

          return (
            <div
              key={sheetIndex}
              className={`page-sheet ${isSheetFlipped ? 'flipped' : ''}`}
              style={{ zIndex }}
            >
              {/* Front side of the sheet */}
              <div
                className="page-side front"
                onClick={handleNext}
              >
                {frontPage && (
                  <div className="page-content">
                    <img src={frontPage.image_url} alt={`Front ${sheetIndex}`} className="w-full h-full object-cover select-none pointer-events-none shadow-sm" />
                    {frontPage.flipbook_video_hotspots?.map(h => (
                      <Hotspot key={h.id} h={h} onPlay={onPlayVideo} />
                    ))}
                  </div>
                )}
                <div className="edge-shading front-shade" />
              </div>

              {/* Back side of the sheet */}
              <div
                className="page-side back"
                onClick={handlePrev}
              >
                {backPage && (
                  <div className="page-content">
                    <img src={backPage.image_url} alt={`Back ${sheetIndex}`} className="w-full h-full object-cover select-none pointer-events-none scale-x-[-1]" />
                    {backPage.flipbook_video_hotspots?.map(h => (
                      <Hotspot key={h.id} h={h} onPlay={onPlayVideo} />
                    ))}
                  </div>
                )}
                <div className="edge-shading back-shade" />
              </div>
            </div>
          )
        })}

        <div className="base-back-cover" />
      </div>

      {/* Manual Navigation Controls */}
      <div className="absolute bottom-10 flex flex-col items-center gap-4 z-[100]">
        <div className="flex gap-4">
          <button onClick={handlePrev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 border border-white/10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={handleNext} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 border border-white/10">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
        {isMobile && (
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em] bg-black/40 px-3 py-1 rounded-full border border-white/5">
            Page {currentStep + 1} / {totalPages}
          </span>
        )}
      </div>

      <style jsx>{`
        .flip-book-wrapper {
          --book-w: 320px;
          --book-h: 450px;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 550px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          perspective: 2500px;
          overflow: visible;
          padding: 20px;
        }

        /* Mobile Scale Adjustments */
        @media (max-width: 640px) {
          .flip-book-wrapper {
            --book-w: 240px;
            --book-h: 340px;
            min-height: 450px;
          }
        }

        @media (max-width: 480px) {
          .flip-book-wrapper {
            --book-w: 200px;
            --book-h: 280px;
            min-height: 400px;
          }
        }

        .flip-book {
          width: var(--book-w);
          height: var(--book-h);
          position: relative;
          transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1);
          transform-style: preserve-3d;
          box-shadow: 0 30px 60px -10px rgba(0,0,0,0.5);
        }

        /* Desktop shift: Centers the spread */
        .flip-book.is-opened-desktop {
          transform: translateX(calc(var(--book-w) / 2));
        }

        /* Mobile shift: Focuses on the left page by shifting book fully right */
        .flip-book.is-focus-left-mobile {
          transform: translateX(var(--book-w));
        }

        .page-sheet {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: left center;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1), z-index 0s 0.4s;
          cursor: pointer;
        }

        .page-sheet.flipped {
          transform: rotateY(-180deg);
        }

        .page-side {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          backface-visibility: hidden;
          background-color: white;
          overflow: hidden;
        }

        .page-side.front {
          border-radius: 0 8px 8px 0;
        }

        .page-side.back {
          transform: rotateY(180deg);
          border-radius: 8px 0 0 8px;
        }

        .page-content {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .base-back-cover {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          background-color: #1a1a1a;
          border-radius: 0 8px 8px 0;
          z-index: -1;
        }

        .edge-shading {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        .front-shade {
          background: linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.05) 100%);
        }

        .back-shade {
          background: linear-gradient(to left, rgba(0,0,0,0.15) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.05) 100%);
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
      className="absolute cursor-pointer z-30"
      style={{
        left: `${h.x}%`,
        top: `${h.y}%`,
        width: `${h.width}%`,
        height: `${h.height}%`,
      }}
    />
  )
}
