import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

function tryDecodeURIComponent(str: string): string {
  try { return decodeURIComponent(str) } catch { return str }
}

const albumsIdVideoPlay = new Hono()

// GET /api/albums/:id/video-play/public — no auth, for public flipbook video hotspots
albumsIdVideoPlay.get('/public', async (c) => {
  const albumId = c.req.param('id')
  const urlParam = c.req.query('url')
  if (!urlParam || !albumId) return c.json({ error: 'url required' }, 400)

  let videoUrl: string
  try { videoUrl = decodeURIComponent(urlParam) } catch { return c.json({ error: 'Invalid url' }, 400) }

  const admin = getAdminSupabaseClient(c?.env as any)
  const { data: album } = await admin.from('albums').select('id').eq('id', albumId).maybeSingle()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const match = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (!match) return c.json({ error: 'Invalid video URL' }, 400)

  const pathEncoded = match[1]
  const pathDecoded = tryDecodeURIComponent(pathEncoded)

  let data: ArrayBuffer | null = null
  let contentType = 'video/mp4'
  for (const path of [pathDecoded, pathEncoded]) {
    const { data: fileData, error } = await admin.storage.from('album-photos').download(path)
    if (!error && fileData) {
      data = await fileData.arrayBuffer()
      contentType = fileData.type || 'video/mp4'
      break
    }
  }
  if (!data) return c.json({ error: 'Video tidak ditemukan' }, 404)

  const totalLength = data.byteLength
  const rangeHeader = c.req.header('range')

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
})

// GET /api/albums/:id/video-play — authenticated
albumsIdVideoPlay.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const urlParam = c.req.query('url')
  if (!urlParam || !albumId) return c.json({ error: 'url required' }, 400)

  let videoUrl: string
  try { videoUrl = decodeURIComponent(urlParam) } catch { return c.json({ error: 'Invalid url' }, 400) }

  const admin = getAdminSupabaseClient(c?.env as any)
  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)

  const match = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (!match) return c.json({ error: 'Invalid video URL' }, 400)

  const pathEncoded = match[1]
  const pathDecoded = tryDecodeURIComponent(pathEncoded)

  let data: ArrayBuffer | null = null
  let contentType = 'video/mp4'
  for (const path of [pathDecoded, pathEncoded]) {
    const { data: fileData, error } = await admin.storage.from('album-photos').download(path)
    if (!error && fileData) {
      data = await fileData.arrayBuffer()
      contentType = fileData.type || 'video/mp4'
      break
    }
  }
  if (!data) return c.json({ error: 'Video tidak ditemukan' }, 404)

  const totalLength = data.byteLength
  const rangeHeader = c.req.header('range')

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
})

export default albumsIdVideoPlay