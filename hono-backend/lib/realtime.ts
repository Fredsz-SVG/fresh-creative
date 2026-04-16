import type { Context } from 'hono'
import type { DurableObjectNamespace } from '@cloudflare/workers-types'

export type RealtimeEventType =
  | 'pricing.updated'
  | 'showcase.updated'
  | 'r2.object.put'
  | 'r2.object.delete'
  | 'api.mutated'

export type RealtimeEvent = {
  type: RealtimeEventType
  channel: string
  payload: Record<string, unknown>
  ts: string
}

type RealtimeEnv = {
  REALTIME_HUB?: DurableObjectNamespace
}

type GlobalWithEnv = typeof globalThis & { env?: Record<string, unknown> }

function getRealtimeHub(env: unknown): DurableObjectNamespace | null {
  return ((env as RealtimeEnv | undefined)?.REALTIME_HUB ?? null) as DurableObjectNamespace | null
}

export async function publishRealtimeEvent(env: unknown, event: RealtimeEvent): Promise<void> {
  const hub = getRealtimeHub(env)
  if (!hub) return
  const id = hub.idFromName('global')
  const stub = hub.get(id)
  try {
    await stub.fetch('https://realtime-hub/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (err) {
    console.error('Realtime publish error:', err)
  }
}

export async function publishRealtimeEventFromContext(
  c: Context,
  event: RealtimeEvent
): Promise<void> {
  await publishRealtimeEvent(c.env, event)
}

export async function publishRealtimeEventFromGlobal(event: RealtimeEvent): Promise<void> {
  const runtimeGlobal = globalThis as GlobalWithEnv
  await publishRealtimeEvent(runtimeGlobal.env, event)
}
