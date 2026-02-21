import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import YearbookAlbumClient from '@/components/yearbook/YearbookAlbumClient'
import { getAlbumOverview, getAlbumAllMembers, getMyAccessAndRequests } from '@/lib/services/yearbook-service'

function groupMembers(members: any[], currentUserId: string) {
  const grouped: Record<string, any[]> = {}
  members.forEach(m => {
    if (m.class_id) {
      if (!grouped[m.class_id]) grouped[m.class_id] = []
      const isMe = m.user_id === currentUserId
      const { class_id, ...rest } = m
      grouped[m.class_id].push({ ...rest, is_me: isMe })
    }
  })
  return grouped
}

export default async function AdminYearbookAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  const [album, allMembersRaw, accessData] = await Promise.all([
    getAlbumOverview(id, user.id),
    getAlbumAllMembers(id),
    getMyAccessAndRequests(id, user.id)
  ])
  if (!album) {
    return notFound()
  }
  const initialMembers = groupMembers(allMembersRaw ?? [], user.id)
  return (
    <YearbookAlbumClient
      initialAlbum={album as any}
      initialMembers={initialMembers}
      initialAccess={accessData as any}
      backHref="/admin/albums"
      backLabel="Ke Manajemen Album"
    />
  )
}
