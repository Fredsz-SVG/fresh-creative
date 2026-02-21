import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { isValidSectionSlug } from '@/components/yearbook/lib/yearbook-paths'

/** Redirect /admin/album/yearbook/[id]/[section] → /admin/album/yearbook/[id]?section=... (sama seperti user). */
export default async function AdminYearbookSectionRedirect(props: {
  params: Promise<{ id: string; section: string }>
}) {
  const { id, section } = await props.params
  if (!isValidSectionSlug(section)) {
    return notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  redirect(`/admin/album/yearbook/${id}?section=${section}`)
}
