import BackLink from '@/components/dashboard/BackLink'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'

export default function UserPhotoToVideoPage() {
  return (
    <div className="p-0">
      <BackLink href="/user/portal/ai-labs" />
      <PhotoToVideo />
    </div>
  )
}
