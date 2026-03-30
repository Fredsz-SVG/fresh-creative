import type { Context } from 'hono'
import { r2ObjectKeyFromAlbumPath } from './storage-layout'

/** URL publik lewat Worker `/api/files/...` (key R2 penuh, mis. `album-photos/...`). */
export function publicFileUrlFromR2Key(c: Context, r2ObjectKey: string): string {
  const u = new URL(c.req.url)
  const segments = r2ObjectKey.split('/').filter(Boolean)
  const path = segments.map((s) => encodeURIComponent(s)).join('/')
  return `${u.origin}/api/files/${path}`
}

/** Path relatif di bucket album (tanpa prefix `album-photos/`) → URL publik. */
export function publicAlbumAssetUrl(c: Context, relativePathInsideAlbumBucket: string): string {
  return publicFileUrlFromR2Key(c, r2ObjectKeyFromAlbumPath(relativePathInsideAlbumBucket))
}
