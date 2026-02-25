import { Suspense } from 'react'
import AdminLayoutClient from './AdminLayoutClient'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  )
}
