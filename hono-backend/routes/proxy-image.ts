import { Hono } from 'hono'

const proxyImage = new Hono()

// GET /api/proxy-image?url=...
proxyImage.get('/', async (c) => {
  const url = c.req.query('url')
  // Only allow http(s) URLs and basic validation
  if (!url || !/^https?:\/\//.test(url)) {
    return c.json({ error: 'Invalid or disallowed URL' }, 400)
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FreshCreative/1.0' } })
    if (!res.ok) return c.json({ error: 'Failed to fetch image' }, 502)
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await res.arrayBuffer()
    // Cloudflare Workers: use Response directly, no Buffer
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('proxy-image error:', e)
    return c.json({ error: 'Proxy error' }, 502)
  }
})

export default proxyImage