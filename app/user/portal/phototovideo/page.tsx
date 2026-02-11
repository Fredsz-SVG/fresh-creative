import { redirect } from 'next/navigation'

/** Fitur Photo to Video hanya tersedia di dalam album (sidebar AI Labs). Akses langsung dialihkan ke dashboard. */
export default function UserPhotoToVideoPage() {
  redirect('/user/portal')
}
