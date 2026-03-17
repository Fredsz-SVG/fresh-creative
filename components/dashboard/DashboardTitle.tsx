'use client'

import type { ReactNode } from 'react'

type DashboardTitleProps = {
  title: ReactNode
  subtitle?: string
}

export default function DashboardTitle({ title, subtitle }: DashboardTitleProps) {
  return (
    <div className="mb-5 md:mb-6">
      <h1 className="text-xl font-extrabold text-gray-800 dark:text-white sm:text-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-400 dark:text-slate-300 text-xs mt-0.5 sm:text-sm font-semibold">
          {subtitle}
        </p>
      )}
    </div>
  )
}
