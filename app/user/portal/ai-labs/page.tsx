import { redirect } from 'next/navigation'

/** AI Labs hanya tersedia di dalam album. Akses langsung dialihkan ke dashboard. */
export default function UserAiLabsPage() {
  redirect('/user/portal')
}
