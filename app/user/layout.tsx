import { Suspense } from 'react'
import UserLayoutClient from './UserLayoutClient'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <UserLayoutClient>{children}</UserLayoutClient>
    </Suspense>
  )
}
