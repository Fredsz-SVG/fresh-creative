'use client'

const SECTIONS = ['preview', 'flipbook', 'approval', 'team', 'sambutan', 'classes', 'ai-labs', 'cover'] as const
export type YearbookSkeletonSection = typeof SECTIONS[number]

export function isValidYearbookSection(s: string | null): s is YearbookSkeletonSection {
  return s !== null && SECTIONS.includes(s as YearbookSkeletonSection)
}

type Props = { section: YearbookSkeletonSection }

const mobileFirstWrapper = 'w-full min-h-screen mx-auto bg-[#0a0a0b] lg:max-w-full'
const contentWrapper = 'max-w-[420px] md:max-w-full w-full mx-auto'

export default function YearbookSkeleton({ section }: Props) {
  const isCover = section === 'cover'
  const showClassesPanel = section === 'classes'
  const isPreview = section === 'preview'
  const isFlipbook = section === 'flipbook'
  const isApproval = section === 'approval'
  const isTeam = section === 'team'
  const isSambutan = section === 'sambutan'
  const isClasses = section === 'classes'
  const isAiLabs = section === 'ai-labs'

  return (
    <div className={mobileFirstWrapper} data-skeleton-section={section}>
      {/* Header - 1:1 dengan YearbookAlbumClient sticky header */}
      <div className="flex sticky top-0 z-50 bg-[#0a0a0b] border-b border-white/10 px-3 lg:px-4 h-14 min-h-[3.5rem] items-center gap-3 lg:gap-4">
        <div className="w-9 h-9 rounded-lg bg-white/5 animate-pulse shrink-0 lg:hidden" aria-hidden />
        <div className="hidden lg:block h-5 w-32 bg-white/5 rounded animate-pulse shrink-0" aria-hidden />
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none lg:contents">
          <div className="h-5 w-28 lg:w-32 bg-white/5 rounded animate-pulse lg:absolute lg:left-1/2 lg:-translate-x-1/2" aria-hidden />
        </div>
        <div className="ml-auto h-9 w-9 rounded-full bg-white/5 animate-pulse shrink-0 lg:hidden" aria-hidden />
      </div>

      {/* Mobile bottom nav placeholder - agar tidak geser saat konten load */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] h-16 border-t border-white/10 bg-[#0a0a0b] lg:hidden flex items-center justify-around">
        <div className="w-10 h-6 bg-white/5 rounded animate-pulse" />
        <div className="w-10 h-6 bg-white/5 rounded animate-pulse" />
        <div className="w-14 h-14 -mt-6 rounded-full bg-white/5 animate-pulse" />
        <div className="w-10 h-6 bg-white/5 rounded animate-pulse" />
        <div className="w-10 h-6 bg-white/5 rounded animate-pulse" />
      </div>

      <div className={`${contentWrapper} flex flex-col min-h-[calc(100vh-3.5rem)]`}>
        <div className="flex-1 flex flex-col p-4 pb-8">
          <div className="flex flex-col lg:flex-row gap-0 flex-1 lg:pl-16 lg:px-0 lg:py-0">
            {/* Icon Sidebar - 1:1 dengan IconSidebar (lg:top-14, w-16, z-40) */}
            <div className="hidden lg:flex fixed left-0 top-14 w-16 h-[calc(100vh-3.5rem)] flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm z-40 py-2" aria-hidden>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1 py-4 border-b border-white/10 last:border-0 w-full">
                  <div className="w-6 h-6 rounded-lg bg-white/5 animate-pulse" />
                  <div className="w-8 h-2 rounded bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>

            {/* Classes panel - 1:1 dengan panel daftar kelas (lg:left-16 top-[3.75rem] w-56) */}
            {showClassesPanel && (
              <div className="hidden lg:flex fixed left-16 top-[3.75rem] w-56 h-[calc(100vh-3.75rem)] flex-col border-r border-white/10 bg-black/30 backdrop-blur-sm z-[35]" aria-hidden>
                <div className="flex-shrink-0 px-4 py-4 border-b border-white/10">
                  <div className="h-9 w-full bg-white/5 rounded-lg animate-pulse" />
                </div>
                <div className="flex-1 overflow-hidden px-2 py-2 space-y-1.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-12 px-2 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
                <div className="flex-shrink-0 px-2 py-2 border-t border-white/10">
                  <div className="h-10 w-full rounded-lg bg-white/5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Main content area - margin/padding 1:1 dengan YearbookClassesViewUI */}
            <div
              className={`flex-1 flex flex-col min-h-0 ${showClassesPanel ? 'pt-14 lg:pt-0' : 'pt-0'} ${showClassesPanel ? 'lg:ml-[18rem]' : 'lg:ml-0'}`}
            >
              <div className="flex-1 overflow-y-auto rounded-t-none pb-40 lg:pb-0">
                {/* Cover - 1:1 dengan cover view */}
                {isCover && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-xs mx-auto flex flex-col items-center">
                        <div className="relative w-full aspect-[3/4] bg-white/5 rounded-xl overflow-hidden border border-white/10 animate-pulse" />
                        <div className="mt-4 w-full max-w-xs space-y-2">
                          <div className="h-7 w-3/4 mx-auto bg-white/5 rounded animate-pulse" />
                          <div className="h-4 w-1/2 mx-auto bg-white/5 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview - 1:1 dengan PreviewView (centered card + dots) */}
                {isPreview && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
                      <div className="w-full max-w-lg aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse" />
                      </div>
                      <div className="mt-8 flex gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-2 w-2 rounded-full bg-white/10 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Flipbook - 1:1 dengan FlipbookView / LayoutEditor */}
                {isFlipbook && (
                  <div className="flex flex-col h-full overflow-hidden relative min-h-[70vh]">
                    <div className="flex-1 flex items-center justify-center p-4">
                      <div className="w-full max-w-4xl aspect-[3/4] rounded-xl border border-white/10 bg-white/5 animate-pulse flex items-center justify-center">
                        <span className="text-xs text-gray-500">Preview halaman</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval - 1:1 dengan ApprovalView (max-w-5xl, stats bar, tabs, list) */}
                {isApproval && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                    <div className="mb-4 sm:mb-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-full max-w-xs mb-6">
                      <div className="flex-1 h-10 rounded-lg bg-white/10 animate-pulse" />
                      <div className="flex-1 h-10 rounded-lg bg-white/5 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse flex items-center gap-4 p-4">
                          <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-40 bg-white/10 rounded" />
                            <div className="h-3 w-24 bg-white/5 rounded" />
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <div className="h-9 w-20 rounded-lg bg-white/5 animate-pulse" />
                            <div className="h-9 w-20 rounded-lg bg-white/5 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team - 1:1 dengan TeamView (max-w-5xl, search sm:w-64, list p-2.5 sm:p-3) */}
                {isTeam && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="relative w-full sm:w-64">
                        <div className="h-9 w-full rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-white/5 animate-pulse flex items-center gap-2 sm:gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="h-4 w-36 bg-white/10 rounded" />
                            <div className="h-3 w-28 bg-white/5 rounded" />
                          </div>
                          <div className="h-7 w-16 rounded-full bg-white/5 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sambutan - 1:1 dengan SambutanView grid (grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4) */}
                {isSambutan && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="h-10 w-24 rounded-xl bg-lime-500/20 animate-pulse" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-pulse flex flex-col">
                          <div className="w-full aspect-[4/5] bg-white/10" />
                          <div className="p-3 space-y-2">
                            <div className="h-4 w-4/5 bg-white/10 rounded" />
                            <div className="h-3 w-1/2 bg-white/5 rounded" />
                            <div className="h-8 w-full rounded-lg bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Classes - 1:1 dengan classes content (hero + grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6) */}
                {isClasses && (
                  <div className="flex flex-col gap-4 py-3">
                    <div className="bg-white/5 border-y border-white/10 overflow-hidden px-3 py-3 flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 order-2 sm:order-1 w-full sm:w-auto space-y-2">
                        <div className="h-7 w-44 bg-white/10 rounded animate-pulse mx-auto sm:mx-0" />
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse flex items-center gap-2 mx-auto sm:mx-0" />
                      </div>
                      <div className="w-full sm:max-w-md aspect-video order-1 sm:order-2 rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                    </div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 px-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-pulse flex flex-col">
                          <div className="w-full aspect-[4/5] bg-white/10" />
                          <div className="p-2 space-y-1">
                            <div className="h-4 w-3/4 bg-white/10 rounded" />
                            <div className="h-6 w-full rounded bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Labs - 1:1 dengan AILabsView (grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5, cards min-h-[140px] sm:min-h-[160px]) */}
                {isAiLabs && (
                  <div className="max-w-5xl mx-auto px-3 py-3 sm:p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center justify-center rounded-2xl border-2 border-white/10 bg-white/[0.04] p-5 sm:p-6 min-h-[140px] sm:min-h-[160px] animate-pulse"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 mb-3" />
                          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                          <div className="h-3 w-32 bg-white/5 rounded animate-pulse mt-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
