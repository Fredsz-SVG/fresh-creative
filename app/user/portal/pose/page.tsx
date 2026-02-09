import BackLink from '@/components/dashboard/BackLink'
import Pose from '@/components/fitur/Pose'

export default function UserPosePage() {
  return (
    <div className="p-0">
      <BackLink href="/user/portal/ai-labs" />
      <Pose />
    </div>
  )
}
