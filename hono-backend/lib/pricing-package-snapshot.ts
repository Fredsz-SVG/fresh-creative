export type PricingPackageSnapshotSource = {
  name: string
  price_per_student: number
  min_students: number
  features: unknown
  flipbook_enabled: number | boolean
  ai_labs_features: unknown
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getFeaturePrice(feature: unknown): number {
  let parsed = feature
  if (typeof feature === 'string') {
    try {
      parsed = JSON.parse(feature)
    } catch {
      return 0
    }
  }
  if (!parsed || typeof parsed !== 'object') return 0
  const price = Number((parsed as { price?: unknown }).price)
  return Number.isFinite(price) ? price : 0
}

function normalizeSelectedAddonIndices(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0)
}

export function buildPackageSnapshotJson(
  pkgData: PricingPackageSnapshotSource,
  selectedAddonIndicesInput: unknown
) {
  const selectedAddonIndices = normalizeSelectedAddonIndices(selectedAddonIndicesInput)
  const selectedAddonSet = new Set(selectedAddonIndices)
  const features = parseJsonArray(pkgData.features).filter((feature, index) => {
    const price = getFeaturePrice(feature)
    return price <= 0 || selectedAddonSet.has(index)
  })

  return JSON.stringify({
    name: pkgData.name,
    price_per_student: pkgData.price_per_student,
    min_students: pkgData.min_students,
    features,
    selected_addon_indices: selectedAddonIndices,
    flipbook_enabled: Boolean(pkgData.flipbook_enabled),
    ai_labs_features: parseJsonArray(pkgData.ai_labs_features),
  })
}
