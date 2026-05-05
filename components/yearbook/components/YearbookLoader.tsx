'use client'

const SECTIONS = ['preview', 'flipbook', 'approval', 'team', 'sambutan', 'classes', 'ai-labs', 'cover'] as const
export type YearbookLoaderSection = typeof SECTIONS[number]

export function isValidYearbookSection(s: string | null): s is YearbookLoaderSection {
  return s !== null && SECTIONS.includes(s as YearbookLoaderSection)
}

export default function YearbookLoader({ section: _ }: { section: YearbookLoaderSection }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-amber-400 dark:border-t-amber-400 animate-spin" />
    </div>
  )
}










