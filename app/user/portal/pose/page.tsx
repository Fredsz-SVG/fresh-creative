import { redirect } from 'next/navigation'

/** Fitur Pose hanya tersedia di dalam album (sidebar AI Labs). Akses langsung dialihkan ke dashboard. */
export default function UserPosePage() {
  redirect('/user/portal')
}
