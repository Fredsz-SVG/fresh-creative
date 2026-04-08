import BackLink from '@/components/dashboard/BackLink'
import TryOn from '@/components/fitur/TryOn'

export default function AdminTryOnPage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <TryOn />
    </div>
  )
}
