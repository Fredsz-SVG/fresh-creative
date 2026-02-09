import BackLink from '@/components/dashboard/BackLink'
import PhotoGroup from '@/components/fitur/PhotoGroup'

export default function AdminPhotoGroupPage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <PhotoGroup />
    </div>
  )
}
