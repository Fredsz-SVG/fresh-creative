import type { Context } from 'hono'
import { Hono } from 'hono'
import { getD1, getAssets } from '../../../lib/edge-env'
import { getAlbumObject } from '../../../lib/r2-assets'
import { albumPathFromR2Key } from '../../../lib/storage-layout'
import { AppEnv, requireAuthJwt } from '../../../middleware'
import { getAuthUserFromContext } from '../../../lib/auth-user'

function tryDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

function relativeAlbumPathFromUrl(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl, 'https://placeholder.local')
    const raw = u.pathname.replace(/^\/api\/files\//, '')
    if (raw && raw !== u.pathname) {
      const key = raw
        .split('/')
        .filter(Boolean)
        .map((p) => decodeURIComponent(p))
        .join('/')
      return albumPathFromR2Key(key)
    }
  } catch {
    /* fall through */
  }
  const storage = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (storage) return tryDecodeURIComponent(storage[1])
  return null
}

const albumsIdVideoPlay = new Hono<AppEnv>()

async function streamVideoFromR2(c: Context, videoUrl: string): Promise<Response> {
  const bucket = getAssets(c)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)

  const rel = relativeAlbumPathFromUrl(videoUrl)
  if (!rel) return c.json({ error: 'Invalid video URL' }, 400)

  const obj = await getAlbumObject(bucket, rel)
  if (!obj || !obj.body) return c.json({ error: 'Video tidak ditemukan' }, 404)

  const data = await obj.arrayBuffer()
  const contentType = obj.httpMetadata?.contentType || 'video/mp4'
  const totalLength = data.byteLength
  const rangeHeader = c.req.raw.headers.get('range')

  if (rangeHeader?.startsWith('bytes=')) {
    const parts = rangeHeader.slice(6).split('-')
    const start = parts[0] ? parseInt(parts[0], 10) : 0
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1
    const safeStart = Math.min(Math.max(0, start), totalLength - 1)
    const safeEnd = Math.min(Math.max(safeStart, end), totalLength - 1)
    const chunk = data.slice(safeStart, safeEnd + 1)
    return new Response(chunk, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${safeStart}-${safeEnd}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunk.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }
  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(totalLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

albumsIdVideoPlay.get('/public', async (c) => {
  const albumId = c.req.param('id')
  const urlParam = c.req.query('url')
  if (!urlParam || !albumId) return c.json({ error: 'url required' }, 400)

  let videoUrl: string
  try {
    videoUrl = decodeURIComponent(urlParam)
  } catch {
    return c.json({ error: 'Invalid url' }, 400)
  }

  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const album = await db
    .prepare(`SELECT id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  return streamVideoFromR2(c, videoUrl)
})

albumsIdVideoPlay.get('/', async (c) => {
  await requireAuthJwt(c, async () => {})
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const urlParam = c.req.query('url')
  if (!urlParam || !albumId) return c.json({ error: 'url required' }, 400)

  let videoUrl: string
  try {
    videoUrl = decodeURIComponent(urlParam)
  } catch {
    return c.json({ error: 'Invalid url' }, 400)
  }

  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const album = await db
    .prepare(`SELECT id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  return streamVideoFromR2(c, videoUrl)
})

export default albumsIdVideoPlay
