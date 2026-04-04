'use client'

import { useEffect, useState } from 'react'

export function AnimatedCarouselMockup({ imageUrl }: { imageUrl?: string }) {
    return (
        <div className="relative w-full h-full max-w-[95px] sm:max-w-[250px] aspect-[4/5] mx-auto flex items-center justify-center p-0 sm:p-3 perspective-[1000px]">

            {/* Animated Swiping Card Container */}
            <div className="relative w-full h-full overflow-visible">
                <div
                    className="absolute inset-0 w-full h-full animate-[carousel-swipe_6s_cubic-bezier(0.25,1,0.5,1)_infinite]"
                    style={{ animation: 'carousel-swipe 6s cubic-bezier(0.25, 1, 0.5, 1) infinite' }}
                >
                    {/* Card Mockup (Matches PreviewView.tsx) */}
                    <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border-[3px] border-slate-900 dark:border-white shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#a3e635] select-none bg-white dark:bg-slate-900">

                        {/* Background Image */}
                        <div className="absolute inset-0 bg-slate-100">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Cover" className="h-full w-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-300 to-emerald-300" />
                            )}
                        </div>

                        {/* Premium Content Overlay (White gradient fade) */}
                        <div className="absolute inset-x-0 bottom-0 z-20">
                            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 via-45% to-transparent h-[150%] -top-[50%]" />

                            <div className="relative px-4 pb-4 sm:px-5 sm:pb-5 flex flex-col pt-8">
                                {/* Title line */}
                                <div className="w-3/4 h-3 sm:h-4 bg-slate-900 rounded-md mb-2" />

                                {/* Subtitle / Badges */}
                                <div className="flex gap-1.5 mb-3">
                                    <div className="w-1/3 h-2 sm:h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-sm" />
                                    <div className="w-1/4 h-2 sm:h-2.5 bg-indigo-300 border-2 border-slate-900 rounded-sm" />
                                </div>

                                {/* Description Text */}
                                <div className="border-l-[3px] border-emerald-500 pl-2 flex flex-col gap-1.5 mb-3">
                                    <div className="w-full h-1.5 sm:h-2 bg-slate-400 rounded-full" />
                                    <div className="w-5/6 h-1.5 sm:h-2 bg-slate-400 rounded-full" />
                                </div>

                                {/* Bottom Buttons Container */}
                                <div className="flex gap-2">
                                    <div className="flex-1 h-6 sm:h-8 bg-slate-900 dark:bg-slate-800 rounded-lg shadow-[2px_2px_0_0_#334155]" />
                                    <div className="flex-1 h-6 sm:h-8 bg-orange-300 border-2 border-slate-900 dark:border-white rounded-lg shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#a3e635]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shadow underneath */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 blur-xl rounded-full pointer-events-none" />
            </div>

            {/* Keyframes for dramatic swipe card effect */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes carousel-swipe {
          0%, 15% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; }
          30%, 35% { transform: translateX(-120%) rotate(-10deg) scale(0.9); opacity: 0; }
          36% { transform: translateX(120%) rotate(10deg) scale(0.9); opacity: 0; }
          50%, 65% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; }
          80%, 85% { transform: translateX(120%) rotate(10deg) scale(0.9); opacity: 0; }
          86% { transform: translateX(-120%) rotate(-10deg) scale(0.9); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; }
        }
      `}} />
        </div>
    )
}

export function AnimatedFlipbookMockup() {
    return (
        <div className="relative w-full h-full max-w-[220px] sm:max-w-[340px] aspect-[4/3] mx-auto rounded-xl bg-orange-200 dark:bg-orange-950/40 border-[3px] border-slate-900 dark:border-white shadow-[5px_5px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a] dark:shadow-[5px_5px_0_0_#a3e635] sm:dark:shadow-[8px_8px_0_0_#a3e635] overflow-visible flex items-center justify-center p-2 sm:p-3 [perspective:1000px]">

            {/* Book Container */}
            <div className="relative w-full h-full bg-white border-2 border-slate-900 rounded-md flex [transform-style:preserve-3d]">

                {/* Left Page (Static) */}
                <div className="w-1/2 h-full border-r-[3px] border-slate-900 p-3 flex flex-col gap-2 relative shadow-[inset_-10px_0_20px_-10px_rgba(0,0,0,0.1)]">
                    <div className="w-3/4 h-3 bg-slate-900 rounded-full"></div>
                    <div className="w-full h-2 bg-slate-300 rounded-full mt-2"></div>
                    <div className="w-full h-2 bg-slate-300 rounded-full"></div>
                    <div className="w-5/6 h-2 bg-slate-300 rounded-full"></div>
                </div>

                {/* Right Page (Static Underneath) */}
                <div className="w-1/2 h-full p-3 flex flex-col gap-2 relative shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.1)] bg-white dark:bg-slate-900">
                    <div className="w-full flex-1 bg-emerald-400 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#a3e635] rounded-md"></div>
                    <div className="w-1/2 h-2 bg-slate-800 dark:bg-slate-300 rounded-full mx-auto"></div>
                </div>

                {/* The Flipping Page */}
                <div
                    className="absolute top-0 left-1/2 w-1/2 h-full bg-white dark:bg-slate-900 border-l-[3px] border-slate-900 dark:border-white shadow-[inset_5px_0_15px_-5px_rgba(0,0,0,0.1)] origin-left flex flex-col gap-2 p-3"
                    style={{
                        animation: 'flipbook-turn 4s ease-in-out infinite'
                    }}
                >
                    <div className="w-full flex-1 bg-indigo-400 border-2 border-slate-900 dark:border-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#a3e635] rounded-md"></div>
                    <div className="w-full h-3 bg-slate-900 dark:bg-slate-300 rounded-full mt-auto"></div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes flipbook-turn {
          0%, 10% { transform: rotateY(0deg); }
          45%, 55% { transform: rotateY(-180deg); }
          90%, 100% { transform: rotateY(0deg); }
        }
      `}} />
        </div>
    )
}
