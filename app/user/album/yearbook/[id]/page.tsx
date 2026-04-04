
import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import YearbookAlbumClient from '@/components/yearbook/YearbookAlbumClient'
import { getAlbumOverview, getMyAccessAndRequests } from '@/lib/services/yearbook-service'

export default async function YearbookAlbumPage(props: { params: Promise<{ id: string }>; backHref?: string; backLabel?: string }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Parallel Fetch
  // We can fetch Access first to fail fast if unauthorized? 
  // But getAlbumOverview handles permission check internally and returns null if no access.

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
      backHref={props.backHref}
      backLabel={props.backLabel}
    />
  )
}
