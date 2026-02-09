import YearbookAlbumPage from '@/app/user/portal/album/yearbook/[id]/page'

export default function AdminYearbookAlbumPage() {
  return (
    <YearbookAlbumPage
      backHref="/admin/albums"
      backLabel="Ke Manajemen Album"
    />
  )
}
