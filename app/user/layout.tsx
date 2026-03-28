import { Suspense } from 'react'
import UserLayoutClient from './UserLayoutClient'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-white dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-white/10 border-t-lime-500 dark:border-t-lime-400" />
      </div>
    }>
      <UserLayoutClient>{children}</UserLayoutClient>
    </Suspense>
  )
}
