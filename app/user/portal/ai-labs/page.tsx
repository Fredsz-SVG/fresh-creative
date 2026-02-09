'use client'

import Link from 'next/link'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { AI_LABS_FEATURES_USER } from '@/lib/dashboard-nav'
import { Shirt, UserCircle, ImageIcon, Images, Video } from 'lucide-react'

const ICONS = [Shirt, UserCircle, ImageIcon, Images, Video] as const

export default function UserAiLabsPage() {
  return (
    <>
      <DashboardTitle
        title="AI Labs"
        subtitle="Pilih fitur yang ingin digunakan. Semua fitur AI tersedia di sini."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {AI_LABS_FEATURES_USER.map((feature, index) => {
          const Icon = ICONS[index] ?? Video
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="
                flex flex-col items-center justify-center
                rounded-2xl border-2 border-white/10 bg-white/[0.04]
                p-5 sm:p-6 min-h-[140px] sm:min-h-[160px]
                hover:bg-white/[0.08] hover:border-lime-500/40 active:scale-[0.98]
                transition-all duration-200 touch-manipulation
                hover:shadow-[0_0_24px_rgba(132,204,22,0.12)]
              "
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-lime-500/20 flex items-center justify-center mb-3 text-lime-400">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="text-sm sm:text-base font-bold text-white uppercase tracking-tight text-center">
                {feature.label}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 text-center mt-1 line-clamp-2">
                {feature.description}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
