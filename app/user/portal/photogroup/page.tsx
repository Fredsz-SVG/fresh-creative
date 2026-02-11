import { redirect } from 'next/navigation'

/** Fitur Photo Group hanya tersedia di dalam album (sidebar AI Labs). Akses langsung dialihkan ke dashboard. */
export default function UserPhotoGroupPage() {
  redirect('/user/portal')
}
