/**
 * Type-safe response parsing helpers for unknown JSON payloads
 */

export const asObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export const asNumberRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

export const getErrorMessage = (value: unknown, fallback: string): string => {
  const message = asString(asObject(value).error)
  return message && message.trim().length > 0 ? message : fallback
}
