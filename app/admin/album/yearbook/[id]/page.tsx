import YearbookAlbumPage from '@/app/user/portal/album/yearbook/[id]/page'

export default async function AdminYearbookAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <YearbookAlbumPage
      params={params}
      backHref="/admin/albums"
      backLabel="Ke Manajemen Album"
    />
  )
}
