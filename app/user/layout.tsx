import { Suspense } from 'react'
import UserLayoutClient from './UserLayoutClient'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-lime-500" />
      </div>
    }>
      <UserLayoutClient>{children}</UserLayoutClient>
    </Suspense>
  )
}
