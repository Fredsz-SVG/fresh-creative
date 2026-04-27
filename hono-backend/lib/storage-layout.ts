/**
 * Konvensi path storage untuk R2.
 *
 * R2: satu bucket (binding ASSETS, mis. `fresh-creative-assets`) + object key:
 *      `album-photos/<path relatif>`.
 *
 * Pola path di route (relatif terhadap prefix `album-photos/`):
 * - `{albumId}/cover.{ext}`
 * - `{albumId}/cover-video.{ext}`
 * - `{albumId}/{classId}/{uuid}.{ext}`  (foto siswa per kelas)
 * - `classes/{classId}/{timestamp}.{ext}`  (foto batch kelas)
 * - `teachers/{teacherId}/{timestamp}.{ext}`  (foto guru)
 */
export const ALBUM_ASSETS_PREFIX = 'album-photos' as const

/** Key objek R2 = prefix bucket Supabase + path relatif (mirror 1:1). */
export function r2ObjectKeyFromAlbumPath(relativePath: string): string {
  const p = relativePath.replace(/^\/+/, '')
  return `${ALBUM_ASSETS_PREFIX}/${p}`
}

/** Path relatif di dalam bucket `album-photos` dari key R2 penuh. */
export function albumPathFromR2Key(r2Key: string): string {
  const prefix = `${ALBUM_ASSETS_PREFIX}/`
  return r2Key.startsWith(prefix) ? r2Key.slice(prefix.length) : r2Key
}
