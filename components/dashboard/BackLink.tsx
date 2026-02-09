'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type BackLinkProps = {
  href: string
  label?: string
}

export default function BackLink({ href, label = 'Kembali' }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation text-xs font-medium mb-2"
    >
      <ChevronLeft className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
