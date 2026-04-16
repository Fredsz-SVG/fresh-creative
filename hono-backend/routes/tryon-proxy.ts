import { Hono } from 'hono'

const TARGET_ORIGIN = 'https://virtual-try-on.fmind.dev'

function withCors(c: import('hono').Context, res: Response): Response {
  const origin = c.req.header('origin') || '*'
  const h = new Headers(res.headers)
  h.set('access-control-allow-origin', origin)
  h.set('access-control-allow-credentials', 'true')
  h.set('access-control-allow-headers', c.req.header('access-control-request-headers') || '*')
  h.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  // Avoid caching preflight in weird dev setups.
  h.set('vary', 'origin')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

const tryonProxy = new Hono()

// Proxy for Gradio (avoid browser CORS to virtual-try-on.fmind.dev)
// Supports:
// - GET  /api/tryon-proxy/config
// - POST /api/tryon-proxy/<gradio endpoints>
tryonProxy.options('/*', (c) => {
  return withCors(
    c,
    new Response(null, {
      status: 204,
      headers: { 'access-control-max-age': '600' },
    })
  )
})

function getUpstreamPathname(requestUrl: string): string {
  const url = new URL(requestUrl)
  // Depending on how router is mounted, pathname could be:
  // - /api/tryon-proxy/config (full)
  // - /config (already stripped)
  const full = url.pathname
  return full.startsWith('/api/tryon-proxy')
    ? full.slice('/api/tryon-proxy'.length) || '/'
    : full || '/'
}

tryonProxy.get('/config', async (c) => {
  const target = new URL(TARGET_ORIGIN)
  target.pathname = '/config'
  const upstream = await fetch(target.toString(), {
    method: 'GET',
    headers: {
      // Gradio sometimes checks origin/referer
      origin: TARGET_ORIGIN,
      referer: `${TARGET_ORIGIN}/`,
    },
  })
  return withCors(c, upstream)
})

tryonProxy.all('/*', async (c) => {
  const url = new URL(c.req.url)
  const target = new URL(TARGET_ORIGIN)
  target.pathname = getUpstreamPathname(c.req.url)
  target.search = url.search

  const reqInit: RequestInit = {
    method: c.req.method,
    headers: new Headers(c.req.raw.headers),
    body: ['GET', 'HEAD'].includes(c.req.method.toUpperCase())
      ? undefined
      : await c.req.arrayBuffer(),
  }
  // Fix headers for upstream.
  ;(reqInit.headers as Headers).delete('host')
  ;(reqInit.headers as Headers).delete('content-length')
  ;(reqInit.headers as Headers).set('origin', TARGET_ORIGIN)
  ;(reqInit.headers as Headers).set('referer', `${TARGET_ORIGIN}/`)

  const upstream = await fetch(target.toString(), reqInit)
  return withCors(c, upstream)
})

export default tryonProxy
