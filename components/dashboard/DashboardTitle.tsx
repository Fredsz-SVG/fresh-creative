'use client'

type DashboardTitleProps = {
  title: string
  subtitle?: string
}

export default function DashboardTitle({ title, subtitle }: DashboardTitleProps) {
  return (
    <div className="mb-5 md:mb-6">
      <h1 className="text-xl font-bold text-app sm:text-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-muted text-xs mt-0.5 sm:text-sm">
          {subtitle}
        </p>
      )}
    </div>
  )
}
