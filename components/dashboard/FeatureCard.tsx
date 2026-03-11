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

export default function FeatureCard({ href, title, description, icon: Icon, badge }: FeatureCardProps) {
  const isPro = badge === 'PRO'
  const borderColor = isPro ? 'border-pink-200 hover:border-pink-300' : 'border-violet-200 hover:border-violet-300'
  const iconBg = isPro ? 'bg-pink-100 text-pink-500' : 'bg-violet-100 text-violet-500'
  const badgeBg = isPro ? 'bg-pink-500' : 'bg-violet-500'

  return (
    <Link
      href={href}
      className={`
        block rounded-2xl border-2 ${borderColor} bg-white p-4 sm:p-6 min-h-[120px]
        hover:shadow-pastel-lg active:shadow-pastel transition-all duration-250
        touch-manipulation group
      `}
    >
      {badge && (
        <div className="flex justify-end mb-3 sm:mb-4">
          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white ${badgeBg} shadow-sm`}>
            {badge}
          </span>
        </div>
      )}
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${iconBg} transition-transform group-hover:scale-110 duration-300`}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-gray-800 uppercase tracking-tight mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{description}</p>
    </Link>
  )
}
