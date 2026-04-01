import { Hono } from 'hono'
import { getAssets } from '../lib/edge-env'

const ALLOWED_PREFIX = 'album-photos/'

const files = new Hono()

files.get('*', async (c) => {
  const bucket = getAssets(c)
  if (!bucket) return c.json({ error: 'Storage not configured' }, 503)

  const pathname = new URL(c.req.url).pathname
  const prefix = '/api/files/'
  if (!pathname.startsWith(prefix)) return c.notFound()

  let rest = pathname.slice(prefix.length)
  try {
    rest = decodeURIComponent(rest)
  } catch {
    /* gunakan raw */
  }
  if (!rest.startsWith(ALLOWED_PREFIX)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const obj = await bucket.get(rest)
  if (!obj) return c.notFound()

  const headers = new Headers()
  const metadata = obj.httpMetadata
  if (metadata?.contentType) headers.set('Content-Type', metadata.contentType)
  if (metadata?.contentLanguage) headers.set('Content-Language', metadata.contentLanguage)
  if (metadata?.contentDisposition) headers.set('Content-Disposition', metadata.contentDisposition)
  if (metadata?.contentEncoding) headers.set('Content-Encoding', metadata.contentEncoding)
  if (metadata?.cacheControl) headers.set('Cache-Control', metadata.cacheControl)
  if (metadata?.cacheExpiry) headers.set('Expires', metadata.cacheExpiry.toUTCString())
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream')
  }
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=3600')
  }
  return new Response(obj.body as unknown as BodyInit, { headers })
})

export default files
