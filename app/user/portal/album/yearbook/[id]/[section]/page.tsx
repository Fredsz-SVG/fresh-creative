import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { isValidSectionSlug } from '@/components/yearbook/lib/yearbook-paths'

/** Redirect /yearbook/[id]/[section] → /yearbook/[id]?section=... agar satu page saja yang load (navigasi sidebar instant). */
export default async function YearbookSectionRedirect(props: {
  params: Promise<{ id: string; section: string }>
}) {
  const { id, section } = await props.params
  if (!isValidSectionSlug(section)) {
    return notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  redirect(`/user/portal/album/yearbook/${id}?section=${section}`)
}
