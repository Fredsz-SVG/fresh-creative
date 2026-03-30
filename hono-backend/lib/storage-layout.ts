/**
 * Konvensi path storage — sama antara Supabase Storage dan R2.
 *
 * Supabase: bucket `album-photos` + object path (tanpa leading slash).
 * R2: satu bucket (binding ASSETS, mis. `fresh-creative-assets`) + object key:
 *      `album-photos/<path yang sama persis seperti di Supabase>`.
 *
 * Contoh:
 * - Supabase: bucket `album-photos`, path `a1b2.../cover.jpg`
 * - R2 key:     `album-photos/a1b2.../cover.jpg`
 *
 * Pola path di route (relatif terhadap bucket Supabase = suffix key R2 setelah `album-photos/`):
 * - `{albumId}/cover.{ext}`
 * - `{albumId}/cover-video.{ext}`
 * - `{albumId}/{classId}/{uuid}.{ext}`  (foto siswa per kelas)
 * - `classes/{classId}/{timestamp}.{ext}`  (foto batch kelas)
 * - `teachers/{teacherId}/{timestamp}.{ext}`  (foto guru)
 */
export const SUPABASE_STORAGE_BUCKET_ALBUM = 'album-photos' as const

/** Key objek R2 = prefix bucket Supabase + path relatif (mirror 1:1). */
export function r2ObjectKeyFromAlbumPath(relativePath: string): string {
  const p = relativePath.replace(/^\/+/, '')
  return `${SUPABASE_STORAGE_BUCKET_ALBUM}/${p}`
}

/** Path relatif di dalam bucket `album-photos` dari key R2 penuh. */
export function albumPathFromR2Key(r2Key: string): string {
  const prefix = `${SUPABASE_STORAGE_BUCKET_ALBUM}/`
  return r2Key.startsWith(prefix) ? r2Key.slice(prefix.length) : r2Key
}
