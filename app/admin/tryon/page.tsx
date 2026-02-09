import BackLink from '@/components/dashboard/BackLink'
import TryonForm from '@/components/fitur/TryOnForm'

export default function AdminTryOnPage() {
  return (
    <div className="p-0">
      <BackLink href="/admin/ai-labs" />
      <TryonForm />
    </div>
  )
}
