import type { R2Bucket } from '@cloudflare/workers-types'
import { r2ObjectKeyFromAlbumPath } from './storage-layout'

type PutBody = ArrayBuffer | ReadableStream | ArrayBufferView | string | null | Blob

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
  await bucket.put(key, body, {
    httpMetadata: options?.contentType
      ? { contentType: options.contentType, cacheControl: options.cacheControl ?? 'public, max-age=3600' }
      : { cacheControl: options?.cacheControl ?? 'public, max-age=3600' },
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
}
