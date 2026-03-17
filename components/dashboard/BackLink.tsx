'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type BackLinkProps = {
  href: string
  label?: string
  className?: string
}

export default function BackLink({ href, label = 'Kembali', className = '' }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-900 bg-white border-2 border-slate-900 hover:bg-slate-50 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0_0_#0f172a] active:shadow-none transition-all touch-manipulation text-[11px] font-black uppercase tracking-widest mb-4 w-fit ${className}`.trim()}
    >
      <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={3} />
      <span>{label}</span>
    </Link>
  )
}
