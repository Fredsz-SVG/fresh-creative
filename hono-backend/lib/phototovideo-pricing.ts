/** Seedance 1 Lite — duration bounds @see replicate bytedance/seedance-1-lite */
export const PHOTOTOVIDEO_DURATION_MIN = 2
export const PHOTOTOVIDEO_DURATION_MAX = 12

/** Hanya dipakai jika `duration_credits_json` kosong (kompatibilitas lama). */
const LEGACY_DEFAULT_SECONDS = [5, 10] as const

export type PhotoToVideoPricingRow = {
  credits_per_use: number
  duration_credits_json: string | null
}

export function parseDurationCreditsJson(raw: string | null | undefined): Record<string, number> {
  if (!raw || !String(raw).trim()) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(o)) {
      const sec = parseInt(String(k), 10)
      if (!Number.isFinite(sec)) continue
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n) && n >= 0) out[String(sec)] = n
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Durasi yang diizinkan: hanya key di JSON jika JSON tidak kosong;
 * jika JSON kosong → fallback 5 & 10 detik (data lama tanpa tier).
 */
export function allowedPhotoToVideoSeconds(row: PhotoToVideoPricingRow): number[] {
  const fromJson = parseDurationCreditsJson(row.duration_credits_json)
  const keys = Object.keys(fromJson)
    .map((k) => parseInt(k, 10))
    .filter(
      (n) =>
        Number.isFinite(n) &&
        n >= PHOTOTOVIDEO_DURATION_MIN &&
        n <= PHOTOTOVIDEO_DURATION_MAX
    )
    .sort((a, b) => a - b)
  if (keys.length > 0) {
    return keys
  }
  return [...LEGACY_DEFAULT_SECONDS]
}

export function creditsForPhotoToVideoDuration(
  durationSec: number,
  row: PhotoToVideoPricingRow
): number {
  const map = parseDurationCreditsJson(row.duration_credits_json)
  const key = String(durationSec)
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key]
  }
  return row.credits_per_use ?? 0
}

/** Validate request duration for Seedance API + pricing row. */
export function normalizePhotoToVideoDuration(
  raw: unknown,
  row: PhotoToVideoPricingRow
): { ok: true; seconds: number } | { ok: false; error: string } {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'Durasi tidak valid' }
  }
  if (n < PHOTOTOVIDEO_DURATION_MIN || n > PHOTOTOVIDEO_DURATION_MAX) {
    return {
      ok: false,
      error: `Durasi harus ${PHOTOTOVIDEO_DURATION_MIN}–${PHOTOTOVIDEO_DURATION_MAX} detik (batas Seedance 1 Lite; 15 detik tidak didukung).`,
    }
  }
  const allowed = new Set(allowedPhotoToVideoSeconds(row))
  if (!allowed.has(n)) {
    return { ok: false, error: 'Durasi ini tidak diaktifkan untuk pricing saat ini.' }
  }
  return { ok: true, seconds: n }
}
