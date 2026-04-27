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

  redirect(`/user/album/yearbook/${id}?section=${section}`)
}
