/**
 * Virtual try-on memakai model Gemini yang di-host di Replicate (satu billing Replicate):
 * - https://replicate.com/google/gemini-2.5-flash — deskripsi pakaian (teks)
 * - https://replicate.com/google/gemini-2.5-flash-image — gabungan gambar + prompt
 *
 * Alur prompt mengikuti https://github.com/iliasprc/virtual-try-on (services/geminiService.ts).
 */

import Replicate from 'replicate'
import { arrayBufferToBase64 } from './ai-multipart'
import { getSingleReplicateUrl } from './replicate-output'

/** Model ID di Replicate (tanpa hash = versi default terbaru). */
export const REPLICATE_GEMINI_FLASH = 'google/gemini-2.5-flash'
export const REPLICATE_GEMINI_FLASH_IMAGE = 'google/gemini-2.5-flash-image'

export type GeminiImageInput = {
  base64: string
  mimeType: string
}

function parseDataUri(dataUri: string): GeminiImageInput | null {
  const m = /^data:([^;]+);base64,(\S+)$/i.exec(dataUri.trim())
  if (!m) return null
  return { mimeType: m[1], base64: m[2].replace(/\s/g, '') }
}

function toDataUri(input: GeminiImageInput): string {
  return `data:${input.mimeType};base64,${input.base64}`
}

/** Siapkan gambar: data URI, URL http(s), atau base64 mentah. */
export async function imageStringToGeminiInput(s: string): Promise<GeminiImageInput | null> {
  const trimmed = s.trim()
  if (trimmed.startsWith('data:')) {
    return parseDataUri(trimmed)
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const res = await fetch(trimmed)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
    return { base64: arrayBufferToBase64(buf), mimeType: mime }
  }
  if (/^[a-z0-9+/=\s]+$/i.test(trimmed) && trimmed.length > 64) {
    return { base64: trimmed.replace(/\s/g, ''), mimeType: 'image/jpeg' }
  }
  return null
}

function extractImageUrlFromFlashImageOutput(output: unknown): string {
  if (typeof output === 'string') {
    if (output.startsWith('http://') || output.startsWith('https://') || output.startsWith('data:')) {
      return output
    }
  }
  return getSingleReplicateUrl(output)
}

type ReplicateClient = InstanceType<typeof Replicate>

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function extractRetryAfterSeconds(err: unknown): number | null {
  const e = err as {
    response?: { status?: number; headers?: { get?: (k: string) => string | null } }
    status?: number
    message?: string
  }
  const status = e?.response?.status ?? e?.status
  if (status !== 429) return null
  const h = e?.response?.headers?.get?.('retry-after')
  const fromHeader = h ? parseInt(h, 10) : NaN
  if (!Number.isNaN(fromHeader) && fromHeader > 0) return fromHeader
  if (typeof e?.message === 'string') {
    const m = /"retry_after"\s*:\s*(\d+)/.exec(e.message)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!Number.isNaN(n) && n > 0) return n
    }
  }
  return null
}

export async function runWith429Retry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (err) {
      const retryAfter = extractRetryAfterSeconds(err)
      if (retryAfter == null || attempt >= maxRetries) throw err
      attempt++
      await sleep((retryAfter + 1) * 1000)
    }
  }
}

/**
 * Satu pasang person + clothing → URL gambar hasil (Replicate) atau data URL jika model mengembalikan itu.
 */
export async function generateVirtualTryOnGemini(
  replicate: ReplicateClient,
  person: GeminiImageInput,
  clothing: GeminiImageInput
): Promise<string> {
  const prompt = `Create a high-fidelity, photorealistic virtual try-on image.
Take the person from the first image and dress them in the clothing from the second image.

**Crucial Instructions:**
1. **Preserve Person's Identity:** The person's original features—including their face, hair, body shape, skin tone, and pose—must remain completely unchanged and preserved with high fidelity.
2. **Realistic Fit:** The clothing from the second image should be realistically draped and fitted onto the person, matching the lighting, shadows, and overall style of the original photo of the person.
3. **Keep Background:** Do not alter the background of the person's image. The final output should be just the person with the new clothing seamlessly integrated.`

  const output = await runWith429Retry(() =>
    replicate.run(REPLICATE_GEMINI_FLASH_IMAGE, {
      input: {
        prompt,
        image_input: [toDataUri(person), toDataUri(clothing)],
        output_format: 'jpg',
      },
    })
  )

  const url = extractImageUrlFromFlashImageOutput(output)
  if (!url) {
    throw new Error('The AI did not return an image. Please try again with different images.')
  }
  return url
}
