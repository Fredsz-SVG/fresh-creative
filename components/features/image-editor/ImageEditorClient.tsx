'use client'

import dynamic from 'next/dynamic'

// IMPORTANT: react-filerobot-image-editor pulls konva's Node entry on SSR.
// We must disable SSR for the editor bundle to avoid requiring optional 'canvas'.
const ImageEditorFilerobot = dynamic(() => import('./ImageEditorFilerobot'), {
  ssr: false,
  loading: () => (
    <section id="image-editor" className="py-4 md:py-6">
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-4 border-slate-900 dark:border-slate-700 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] p-6 flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-900 dark:border-slate-700 border-t-transparent animate-spin" />
          <span className="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
            Memuat editor...
          </span>
        </div>
      </div>
    </section>
  ),
})

export default function ImageEditorClient() {
  return <ImageEditorFilerobot />
}

