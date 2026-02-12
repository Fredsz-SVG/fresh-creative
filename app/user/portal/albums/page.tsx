
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AlbumsView from '@/components/albums/AlbumsView'
import { getUserAlbums } from '@/lib/services/album-service'

export default async function UserAlbumsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch initial data (SSR with Redis Cache)
  const albums = await getUserAlbums(user.id, false)

  return <AlbumsView variant="user" initialData={albums} />
}
