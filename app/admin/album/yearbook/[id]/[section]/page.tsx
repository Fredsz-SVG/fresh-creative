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

  redirect(`/admin/album/yearbook/${id}?section=${section}`)
}
