import type { D1Database } from '@cloudflare/workers-types'

export const SHOWCASE_KEY = 'showcase'

export type ShowcasePayload = {
  albumPreviews: { title: string; imageUrl: string; link: string }[]
  flipbookPreviewUrl: string
}

export const defaultShowcase: ShowcasePayload = {
  albumPreviews: [],
  flipbookPreviewUrl: '',
}

export async function getShowcaseFromD1(db: D1Database): Promise<ShowcasePayload> {
  const row = await db
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .bind(SHOWCASE_KEY)
    .first<{ value: string }>()
  if (!row?.value) return defaultShowcase
  try {
    const raw = JSON.parse(row.value) as Record<string, unknown>
    const albumPreviews = Array.isArray(raw.albumPreviews) ? raw.albumPreviews : defaultShowcase.albumPreviews
    const flipbookPreviewUrl =
      typeof raw.flipbookPreviewUrl === 'string' ? raw.flipbookPreviewUrl : defaultShowcase.flipbookPreviewUrl
    return {
      albumPreviews: albumPreviews as ShowcasePayload['albumPreviews'],
      flipbookPreviewUrl,
    }
  } catch {
    return defaultShowcase
  }
}

export async function saveShowcaseToD1(db: D1Database, payload: ShowcasePayload): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
    .bind(SHOWCASE_KEY, JSON.stringify(payload))
    .run()
}

/** Isi imageUrl dari cover album di D1 jika link mengarah ke /album/:id atau /yearbook/:id */
export async function enrichShowcasePreviewsWithAlbumCovers(
  db: D1Database,
  albumPreviews: ShowcasePayload['albumPreviews']
): Promise<ShowcasePayload['albumPreviews']> {
  return Promise.all(
    albumPreviews.map(async (preview) => {
      if (!preview.link) return preview
      const m = preview.link.match(/(?:album|yearbook)\/([^/?]+)/)
      if (!m?.[1]) return preview
      const row = await db
        .prepare('SELECT cover_image_url FROM albums WHERE id = ?')
        .bind(m[1])
        .first<{ cover_image_url: string | null }>()
      if (row?.cover_image_url) {
        return { ...preview, imageUrl: row.cover_image_url }
      }
      return preview
    })
  )
}
