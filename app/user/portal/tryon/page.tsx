import BackLink from '@/components/dashboard/BackLink'
import TryOn from '@/components/fitur/TryOn'

export default function UserTryOnPage() {
  return (
    <div className="p-0">
      <BackLink href="/user/portal/ai-labs" />
      <TryOn />
    </div>
  )
}
