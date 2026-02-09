import BackLink from '@/components/dashboard/BackLink'
import PhotoToVideo from '@/components/fitur/PhotoToVideo'

export default function AdminPhotoToVideoPage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <PhotoToVideo />
    </div>
  )
}
