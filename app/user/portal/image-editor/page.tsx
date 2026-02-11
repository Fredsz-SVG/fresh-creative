import { redirect } from 'next/navigation'

/** Fitur Image Editor hanya tersedia di dalam album (sidebar AI Labs). Akses langsung dialihkan ke dashboard. */
export default function UserImageEditorPage() {
  redirect('/user/portal')
}
