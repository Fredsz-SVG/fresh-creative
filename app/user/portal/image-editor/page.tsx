import BackLink from '@/components/dashboard/BackLink'
import ImageEditor from '@/components/fitur/ImageEditor'

export default function UserImageEditorPage() {
  return (
    <div className="p-0">
      <BackLink href="/user/portal/ai-labs" />
      <ImageEditor />
    </div>
  )
}
