import { notFound } from 'next/navigation'
import YearbookAlbumClient from '@/components/yearbook/YearbookAlbumClient'
import { getAlbumOverview } from '@/lib/services/yearbook-service'

export default async function YearbookAlbumPage(props: { params: Promise<{ id: string }>; backHref?: string; backLabel?: string }) {
  const { id } = await props.params
  const album = await getAlbumOverview(id)

  if (!album) {
    return notFound()
  }

  return (
    <YearbookAlbumClient
      initialAlbum={album as any}
      initialMembers={{}}
      initialAccess={{ access: {}, requests: {} } as any}
      backHref={props.backHref}
      backLabel={props.backLabel}
    />
  )
}
