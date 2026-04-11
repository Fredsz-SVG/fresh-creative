/**
 * Normalize Replicate SDK output: strings, FileOutput (url() → URL), or arrays thereof.
 */

type UrlHolder = {
  url?: string | (() => string | URL)
}

export function extractReplicateFileUrl(item: unknown): string {
  if (typeof item === 'string') return item
  if (item instanceof URL) return item.href
  if (!item || typeof item !== 'object') return ''
  const u = (item as UrlHolder).url
  if (typeof u === 'function') {
    try {
      const out = u()
      if (typeof out === 'string') return out
      if (out instanceof URL) return out.href
    } catch {
      return ''
    }
  }
  if (typeof u === 'string') return u
  return ''
}

const MAX_REPLICATE_UNWRAP_DEPTH = 8

/** Satu atau banyak gambar/file dari replicate.run(). */
export function normalizeReplicateOutputToUrls(output: unknown, depth = 0): string[] {
  if (output == null) return []
  if (depth > MAX_REPLICATE_UNWRAP_DEPTH) return []

  // Unwrap bentuk umum prediksi Replicate / Gemini Flash Image (kadang berbeda antar versi SDK atau run).
  if (typeof output === 'object' && !Array.isArray(output)) {
    const o = output as Record<string, unknown>
    if ('output' in o && o.output != null) {
      return normalizeReplicateOutputToUrls(o.output, depth + 1)
    }
    if (Array.isArray(o.images) && o.images.length > 0) {
      return normalizeReplicateOutputToUrls(o.images, depth + 1)
    }
    if (Array.isArray(o.outputs) && o.outputs.length > 0) {
      return normalizeReplicateOutputToUrls(o.outputs, depth + 1)
    }
    if (o.image != null) {
      return normalizeReplicateOutputToUrls(o.image, depth + 1)
    }
    if (o.result != null) {
      return normalizeReplicateOutputToUrls(o.result, depth + 1)
    }
  }

  const items = Array.isArray(output) ? output : [output]
  return items.map(extractReplicateFileUrl).filter(Boolean)
}

/** Model yang mengembalikan satu URL (try-on, photo group, video). */
export function getSingleReplicateUrl(output: unknown): string {
  const urls = normalizeReplicateOutputToUrls(output)
  return urls[0] ?? ''
}
