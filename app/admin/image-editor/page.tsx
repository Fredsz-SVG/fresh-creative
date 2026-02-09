import BackLink from '@/components/dashboard/BackLink'
import ImageEditor from '@/components/fitur/ImageEditor'

export default function AdminImageEditorPage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <ImageEditor />
    </div>
  )
}
