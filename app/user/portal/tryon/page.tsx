import { redirect } from 'next/navigation'

/** Fitur Try On hanya tersedia di dalam album (sidebar AI Labs). Akses langsung dialihkan ke dashboard. */
export default function UserTryOnPage() {
  redirect('/user/portal')
}
