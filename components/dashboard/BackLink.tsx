'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type BackLinkProps = {
  href: string
  label?: string
  className?: string
}

export default function BackLink({ href, label = 'Kembali', className = '' }: BackLinkProps) {
  const router = useRouter()

  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      onMouseEnter={() => {
        try { router.prefetch(href) } catch { }
      }}
      onTouchStart={() => {
        try { router.prefetch(href) } catch { }
      }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-900 bg-white border-2 border-slate-200 hover:bg-slate-50 active:translate-x-0.5 active:translate-y-0.5 shadow-[4px_4px_0_0_#334155] active:shadow-none transition-all touch-manipulation text-[11px] font-black uppercase tracking-widest mb-4 w-fit ${className}`.trim()}
    >
      <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={3} />
      <span>{label}</span>
    </Link>
  )
}
