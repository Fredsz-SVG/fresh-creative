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

/** Satu atau banyak gambar/file dari replicate.run(). */
export function normalizeReplicateOutputToUrls(output: unknown): string[] {
  if (output == null) return []
  const items = Array.isArray(output) ? output : [output]
  return items.map(extractReplicateFileUrl).filter(Boolean)
}

/** Model yang mengembalikan satu URL (try-on, photo group, video). */
export function getSingleReplicateUrl(output: unknown): string {
  const urls = normalizeReplicateOutputToUrls(output)
  return urls[0] ?? ''
}
