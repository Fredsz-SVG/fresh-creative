/**
 * Client-side image prep untuk upload persisten: decode → resize (long edge) → WebP,
 * dengan iterasi kualitas/resolusi agar ukuran file mendekati batas `maxBytes` (default 1000 KiB).
 */

/** Default long-edge cap (px); aspect ratio preserved, tidak pernah di-upscale. */
export const DEFAULT_WEBP_MAX_EDGE = 2560

/** Target maks ukuran file setelah encode (1000 KiB = 1024×1000 byte). */
export const DEFAULT_MAX_UPLOAD_BYTES = 1000 * 1024

const MIN_WEBP_QUALITY = 0.42
const MIN_LONG_EDGE = 640
const QUALITY_STEP = 0.065
const EDGE_SHRINK = 0.82

export type ConvertToWebPOptions = {
  /** Kualitas WebP awal 0–1 sebelum iterasi penurunan. Default ~0.82 */
  quality?: number
  /**
   * Maks lebar atau tinggi (px) setelah resize; sisi terpanjang yang di-clamp.
   * Set `0` untuk menonaktifkan resize (hanya encode WebP).
   */
  maxEdge?: number
  /**
   * Target maks ukuran blob (byte). Iterasi menurunkan kualitas lalu resolusi sampai muat.
   * Set `0` untuk menonaktifkan (satu kali encode dengan quality/maxEdge saja).
   */
  maxBytes?: number
}

type NormalizedOptions = {
  quality: number
  maxEdge: number
  maxBytes: number
}

function normalizeOptions(qualityOrOptions?: number | ConvertToWebPOptions): NormalizedOptions {
  if (typeof qualityOrOptions === 'number') {
    return {
      quality: qualityOrOptions,
      maxEdge: DEFAULT_WEBP_MAX_EDGE,
      maxBytes: DEFAULT_MAX_UPLOAD_BYTES,
    }
  }
  const o = qualityOrOptions ?? {}
  return {
    quality: o.quality ?? 0.82,
    maxEdge: o.maxEdge ?? DEFAULT_WEBP_MAX_EDGE,
    maxBytes: o.maxBytes === undefined ? DEFAULT_MAX_UPLOAD_BYTES : o.maxBytes,
  }
}

function computeDrawSize(
  naturalWidth: number,
  naturalHeight: number,
  maxEdge: number
): { width: number; height: number } {
  let w = naturalWidth
  let h = naturalHeight
  if (!maxEdge || maxEdge <= 0) return { width: w, height: h }
  const long = Math.max(w, h)
  if (long <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / long
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file into data URL'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image into element'))
    img.src = src
  })
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to convert image to WebP'))
      },
      'image/webp',
      quality
    )
  })
}

function encodeCanvasToWebpUnderBudget(
  canvas: HTMLCanvasElement,
  startQuality: number,
  maxBytes: number
): Promise<Blob> {
  let q = Math.min(0.92, Math.max(MIN_WEBP_QUALITY, startQuality))
  let bestTooLarge: Blob | null = null
  let bestTooLargeSize = Infinity

  return (async () => {
    while (q >= MIN_WEBP_QUALITY - 1e-6) {
      const blob = await canvasToWebp(canvas, q)
      if (blob.size <= maxBytes) return blob
      if (blob.size < bestTooLargeSize) {
        bestTooLarge = blob
        bestTooLargeSize = blob.size
      }
      q -= QUALITY_STEP
    }
    return bestTooLarge ?? (await canvasToWebp(canvas, MIN_WEBP_QUALITY))
  })()
}

/**
 * Converts a File (raster image) ke WebP via Canvas.
 * Secara default: clamp long edge, lalu iterasi kualitas + penurunan resolusi sampai ≤ {@link DEFAULT_MAX_UPLOAD_BYTES}.
 */
export async function convertToWebP(
  file: File,
  qualityOrOptions?: number | ConvertToWebPOptions
): Promise<Blob> {
  const opts = normalizeOptions(qualityOrOptions)
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)
  const nw = img.naturalWidth || img.width
  const nh = img.naturalHeight || img.height
  if (!nw || !nh) {
    throw new Error('Invalid image dimensions')
  }

  if (opts.maxBytes <= 0) {
    const { width, height } = computeDrawSize(nw, nh, opts.maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
    return canvasToWebp(canvas, opts.quality)
  }

  let maxEdge = opts.maxEdge > 0 ? opts.maxEdge : DEFAULT_WEBP_MAX_EDGE
  let smallestBlob: Blob | null = null

  for (;;) {
    const { width, height } = computeDrawSize(nw, nh, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await encodeCanvasToWebpUnderBudget(canvas, opts.quality, opts.maxBytes)
    if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob
    if (blob.size <= opts.maxBytes) return blob

    if (maxEdge <= MIN_LONG_EDGE) break

    let next = Math.round(maxEdge * EDGE_SHRINK)
    if (next < MIN_LONG_EDGE) next = MIN_LONG_EDGE
    if (next === maxEdge) break
    maxEdge = next
  }

  if (!smallestBlob) throw new Error('Failed to produce WebP blob')
  return smallestBlob
}
