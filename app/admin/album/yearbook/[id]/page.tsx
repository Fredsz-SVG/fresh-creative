import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import YearbookAlbumClient from '@/components/yearbook/YearbookAlbumClient'
import { getAlbumOverview, getMyAccessAndRequests } from '@/lib/services/yearbook-service'

export default async function AdminYearbookAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const [album, accessData] = await Promise.all([
    getAlbumOverview(id),
    getMyAccessAndRequests(id, user.id)
  ])
  if (!album) {
    return notFound()
  }
  return (
    <YearbookAlbumClient
      initialAlbum={album as any}
      initialMembers={{}}
      initialAccess={accessData as any}
      backHref="/admin/albums"
      backLabel="Ke Manajemen Album"
    />
  )
}
