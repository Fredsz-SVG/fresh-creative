import type { R2Bucket } from '@cloudflare/workers-types'
import { r2ObjectKeyFromAlbumPath } from './storage-layout'
import { publishRealtimeEventFromGlobal } from './realtime'

type PutBody = ArrayBuffer | ReadableStream | ArrayBufferView | string | null | Blob
type PutBodyNormalized = string | ArrayBuffer | ArrayBufferView

const isBlobLike = (value: unknown): value is Blob =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Blob).arrayBuffer === 'function'

const isReadableStreamLike = (value: unknown): value is ReadableStream =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ReadableStream).getReader === 'function'

async function normalizePutBody(body: PutBody): Promise<PutBodyNormalized> {
  if (body === null) return ''
  if (typeof body === 'string') return body
  if (body instanceof ArrayBuffer) return body
  if (ArrayBuffer.isView(body)) return body
  if (isBlobLike(body)) return await body.arrayBuffer()
  if (isReadableStreamLike(body)) {
    return await new Response(body as unknown as BodyInit).arrayBuffer()
  }
  throw new Error('Unsupported upload body type')
}

/**
 * Upload ke R2 dengan key = konvensi Supabase (`album-photos/...`).
 * Untuk URL publik: gunakan route Worker (proxy) atau domain R2 publik + path key.
 */
export async function putAlbumPhoto(
  bucket: R2Bucket,
  relativePathInsideAlbumBucket: string,
  body: PutBody,
  options?: { contentType?: string; cacheControl?: string }
): Promise<{ key: string }> {
  const key = r2ObjectKeyFromAlbumPath(relativePathInsideAlbumBucket)
  const normalized = await normalizePutBody(body)
  await bucket.put(key, normalized, {
    httpMetadata: options?.contentType
      ? { contentType: options.contentType, cacheControl: options.cacheControl ?? 'public, max-age=3600' }
      : { cacheControl: options?.cacheControl ?? 'public, max-age=3600' },
  })
  await publishRealtimeEventFromGlobal({
    type: 'r2.object.put',
    channel: 'assets',
    payload: { key },
    ts: new Date().toISOString(),
  })
  return { key }
}

export async function getAlbumObject(bucket: R2Bucket, relativePathInsideAlbumBucket: string) {
  const key = r2ObjectKeyFromAlbumPath(relativePathInsideAlbumBucket)
  return bucket.get(key)
}

export async function deleteAlbumObject(bucket: R2Bucket, relativePathInsideAlbumBucket: string) {
  const key = r2ObjectKeyFromAlbumPath(relativePathInsideAlbumBucket)
  await bucket.delete(key)
  await publishRealtimeEventFromGlobal({
    type: 'r2.object.delete',
    channel: 'assets',
    payload: { key },
    ts: new Date().toISOString(),
  })
}
