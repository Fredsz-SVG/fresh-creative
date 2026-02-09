import BackLink from '@/components/dashboard/BackLink'
import Pose from '@/components/fitur/Pose'

export default function AdminPosePage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <Pose />
    </div>
  )
}
