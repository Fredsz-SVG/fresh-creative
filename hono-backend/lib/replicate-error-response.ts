import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

function formatUnknownError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message
    if (typeof o.detail === 'string' && o.detail.trim()) return o.detail
    if (typeof o.error === 'string' && o.error.trim()) return o.error
    try {
      const s = JSON.stringify(err)
      if (s && s !== '{}') return s.length > 2000 ? `${s.slice(0, 2000)}…` : s
    } catch {
      /* ignore */
    }
  }
  const s = String(err ?? 'Gagal')
  return s === '[object Object]' ? 'Error tanpa pesan (object). Cek log server.' : s
}

/**
 * Normalisasi error Replicate / SDK untuk response JSON konsisten (429, 4xx, 502, 503).
 * Dipakai route AI yang memanggil replicate.run().
 */
export function respondWithReplicateFriendlyError(
  c: Context,
  err: unknown,
  logLabel: string
): Response {
  console.error(`${logLabel}:`, err)
  const message = formatUnknownError(err)

  const e = err as { response?: { status?: number }; status?: number }
  let status: number | undefined = e?.response?.status ?? e?.status

  let parsed: { status?: number; retry_after?: number; detail?: string } | null = null
  if (typeof message === 'string') {
    const idx = message.lastIndexOf('{')
    if (idx !== -1) {
      const tail = message.slice(idx)
      try {
        const j = JSON.parse(tail) as { status?: number; retry_after?: number; detail?: string }
        if (j && typeof j === 'object') parsed = j
        if (typeof j?.status === 'number') status = j.status
      } catch {
        // ignore
      }
    }
  }

  if (status === 429 || (typeof message === 'string' && message.includes('Too Many Requests'))) {
    const retryAfter =
      typeof parsed?.retry_after === 'number'
        ? parsed.retry_after
        : (() => {
            const m = /"retry_after"\s*:\s*(\d+)/.exec(message)
            return m ? parseInt(m[1], 10) : undefined
          })()
    const hint =
      typeof retryAfter === 'number' && !Number.isNaN(retryAfter) && retryAfter > 0
        ? `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.`
        : 'Terlalu banyak request. Coba lagi beberapa detik lagi.'
    return c.json({ ok: false, error: hint, retry_after: retryAfter }, 429)
  }

  if (typeof status === 'number' && status >= 400 && status < 500) {
    return c.json({ ok: false, error: message }, status as ContentfulStatusCode)
  }

  const lower = typeof message === 'string' ? message.toLowerCase() : ''
  if (
    (typeof status === 'number' && status >= 500) ||
    (typeof message === 'string' &&
      (lower.includes('prediction failed') ||
        lower.includes('replicate') ||
        lower.includes('did not return') ||
        lower.includes('no image url')))
  ) {
    const detail =
      typeof parsed?.detail === 'string' && parsed.detail.trim() ? parsed.detail.trim() : message
    return c.json({ ok: false, error: detail || 'Layanan AI sementara gagal. Coba lagi.' }, 502)
  }

  if (!String(message ?? '').trim()) {
    return c.json({ ok: false, error: 'Layanan AI mengembalikan error tanpa detail. Coba lagi.' }, 502)
  }

  // Bukan Replicate: sering error Supabase/D1/jaringan — tetap JSON jelas, hindari 500 generik tanpa isi.
  if (
    lower.includes('supabase') ||
    lower.includes('jwt') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('d1') ||
    lower.includes('timeout')
  ) {
    return c.json({ ok: false, error: message }, 503)
  }

  return c.json({ ok: false, error: message }, 502)
}
