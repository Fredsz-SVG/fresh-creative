'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type FeatureCardProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  badge?: 'FREE' | 'PRO'
}

export default function FeatureCard({ href, title, description, icon: Icon, badge = 'FREE' }: FeatureCardProps) {
  const isPro = badge === 'PRO'
  const borderColor = isPro ? 'border-purple-500/60' : 'border-cyan-500/60'
  const iconColor = isPro ? 'text-purple-400' : 'text-cyan-400'
  const badgeBg = isPro ? 'bg-purple-500/90' : 'bg-cyan-500/90'

  return (
    <Link
      href={href}
      className={`
        block rounded-2xl border-2 ${borderColor} bg-white/[0.03] p-4 sm:p-6 min-h-[120px]
        hover:bg-white/[0.06] active:bg-white/[0.08] transition-all duration-200
        hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]
        ${isPro ? 'hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]' : ''}
        touch-manipulation
      `}
    >
      <div className="flex justify-end mb-3 sm:mb-4">
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white ${badgeBg}`}>
          {badge}
        </span>
      </div>
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${iconColor}`}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{description}</p>
    </Link>
  )
}
