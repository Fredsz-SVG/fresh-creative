import BackLink from '@/components/dashboard/BackLink'
import PhotoGroup from '@/components/fitur/PhotoGroup'

export default function UserPhotoGroupPage() {
  return (
    <div className="p-0">
      <BackLink href="/user/portal/ai-labs" />
      <PhotoGroup />
    </div>
  )
}
