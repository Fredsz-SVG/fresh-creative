import { useCallback, useState } from 'react'
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asStringArray, asNumberRecord } from '../utils/response-narrowing'

export function useYearbookFeatures(id: string | undefined) {
  const [featureUnlocks, setFeatureUnlocks] = useState<string[]>([])
  const [flipbookEnabledByPackage, setFlipbookEnabledByPackage] = useState(false)
  const [aiLabsFeaturesByPackage, setAiLabsFeaturesByPackage] = useState<string[]>([])
  const [featureCreditCosts, setFeatureCreditCosts] = useState<Record<string, number>>({})
  const [featureUseCosts, setFeatureUseCosts] = useState<Record<string, number>>({})
  const [featureUnlocksLoaded, setFeatureUnlocksLoaded] = useState(false)

  const fetchFeatureUnlocks = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetchWithAuth(`/api/albums/${id}/unlock-feature`, {
        credentials: 'include',
        cache: 'no-store'
      })
      if (res.ok) {
        const data = asObject(await res.json().catch(() => ({})))
        setFeatureUnlocks(asStringArray(data.unlocked_features))
        setFlipbookEnabledByPackage(data.flipbook_enabled_by_package === true || data.flipbook_unlocked_on_album === true)
        setAiLabsFeaturesByPackage(asStringArray(data.ai_labs_features_by_package))
        setFeatureCreditCosts(asNumberRecord(data.credit_costs))
        setFeatureUseCosts(asNumberRecord(data.use_costs))
      }
    } catch (e) {
      console.error('Error fetching feature unlocks:', e)
    } finally {
      setFeatureUnlocksLoaded(true)
    }
  }, [id])

  return {
    featureUnlocks,
    setFeatureUnlocks,
    flipbookEnabledByPackage,
    setFlipbookEnabledByPackage,
    aiLabsFeaturesByPackage,
    setAiLabsFeaturesByPackage,
    featureCreditCosts,
    setFeatureCreditCosts,
    featureUseCosts,
    setFeatureUseCosts,
    featureUnlocksLoaded,
    setFeatureUnlocksLoaded,
    fetchFeatureUnlocks
  }
}
