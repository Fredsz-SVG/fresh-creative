import type { Context } from 'hono'
import type { R2Bucket } from '@cloudflare/workers-types'
import { deleteAlbumObject } from './r2-assets'
import { albumPathFromR2Key } from './storage-layout'
import { getR2KeyFromPublicUrl } from './public-file-url'

/** Hapus satu objek R2 dari URL publik `/api/files/...`. */
export async function deleteR2ObjectFromPublicUrl(
  c: Context,
  bucket: R2Bucket | null | undefined,
  publicUrl: string | null | undefined
): Promise<void> {
  if (!bucket || !publicUrl?.trim()) return
  const key = getR2KeyFromPublicUrl(c, publicUrl.trim())
  if (!key) return
  try {
    await deleteAlbumObject(bucket, albumPathFromR2Key(key))
  } catch {
    /* best-effort */
  }
}

/** Hapus banyak URL sekaligus (mis. saat bersihkan flipbook). */
export async function deleteR2ObjectsFromPublicUrls(
  c: Context,
  bucket: R2Bucket | null | undefined,
  urls: Iterable<string | null | undefined>
): Promise<void> {
  if (!bucket) return
  for (const url of urls) {
    await deleteR2ObjectFromPublicUrl(c, bucket, url)
  }
}
