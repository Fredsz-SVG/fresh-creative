import { notFound } from 'next/navigation'
import YearbookAlbumClient from '@/components/yearbook/YearbookAlbumClient'
import { getAlbumOverview } from '@/lib/services/yearbook-service'

export default async function AdminYearbookAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const album = await getAlbumOverview(id)
  if (!album) {
    return notFound()
  }
  return (
    <YearbookAlbumClient
      initialAlbum={album as any}
      initialMembers={{}}
      initialAccess={{ access: {}, requests: {} } as any}
      backHref="/admin/albums"
      backLabel="Ke Manajemen Album"
    />
  )
}
