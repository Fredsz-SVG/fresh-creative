import type { D1Database } from '@cloudflare/workers-types'

export const FONNTE_CONFIG_KEY = 'fonnte_config'

export type FonnteConfigPayload = {
  target: string // WhatsApp number in format 62xxxxxxxxxx
}

export const defaultFonnteConfig: FonnteConfigPayload = {
  target: '',
}

export async function getFonnteConfigFromD1(db: D1Database): Promise<FonnteConfigPayload> {
  const row = await db
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .bind(FONNTE_CONFIG_KEY)
    .first<{ value: string }>()
  if (!row?.value) return defaultFonnteConfig
  try {
    const raw = JSON.parse(row.value) as Record<string, unknown>
    const target = typeof raw.target === 'string' ? raw.target : defaultFonnteConfig.target
    return { target }
  } catch {
    return defaultFonnteConfig
  }
}

export async function saveFonnteConfigToD1(db: D1Database, payload: FonnteConfigPayload): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)')
    .bind(FONNTE_CONFIG_KEY, JSON.stringify(payload))
    .run()
}
