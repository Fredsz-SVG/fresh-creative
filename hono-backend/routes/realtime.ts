import type { DurableObjectNamespace } from '@cloudflare/workers-types'
import { Hono } from 'hono'

type RealtimeEnv = {
  REALTIME_HUB?: DurableObjectNamespace
}

const realtime = new Hono<{ Bindings: RealtimeEnv }>()

const wsHandler = async (c: any) => {
  const hub = (c.env as RealtimeEnv).REALTIME_HUB
  if (!hub) {
    return c.json({ error: 'Realtime hub is not configured' }, 503)
  }

  const upgrade = c.req.header('Upgrade')
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected websocket upgrade' }, 426)
  }

  const id = hub.idFromName('global')
  const stub = hub.get(id)
  return stub.fetch('https://realtime-hub/ws', {
    method: 'GET',
    headers: c.req.raw.headers,
  })
}

realtime.get('/ws', wsHandler)

export default realtime
