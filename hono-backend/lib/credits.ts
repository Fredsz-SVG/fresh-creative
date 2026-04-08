import type { D1Database } from '@cloudflare/workers-types'
import { getAdminSupabaseClient } from './supabase'
import { ensureUserStubInD1 } from './d1-users'

export async function getCreditsFromSupabase(
  env: Record<string, string> | undefined,
  userId: string
): Promise<number> {
  const admin = getAdminSupabaseClient(env)
  const { data, error } = await (admin as any)
    .from('users')
    .select('credits')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const credits = (data?.credits ?? 0) as unknown
  return typeof credits === 'number' ? credits : 0
}

export async function setCreditsInSupabase(
  env: Record<string, string> | undefined,
  userId: string,
  credits: number
): Promise<void> {
  const admin = getAdminSupabaseClient(env)
  const { error } = await (admin as any).from('users').update({ credits }).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function mirrorCreditsToD1(db: D1Database, userId: string, credits: number): Promise<void> {
  await ensureUserStubInD1(db, userId)
  await db
    .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(credits, userId)
    .run()
}

/**
 * Deduct credits from Supabase (source of truth), then mirror to D1.
 * Not fully atomic under concurrency, but keeps D1 as follower.
 */
export async function deductCreditsFromSupabaseAndMirrorToD1(opts: {
  env: Record<string, string> | undefined
  db: D1Database
  userId: string
  amount: number
}): Promise<{ ok: true; creditsAfter: number } | { ok: false; reason: 'insufficient'; credits: number }> {
  const { env, db, userId, amount } = opts
  if (amount <= 0) {
    const credits = await getCreditsFromSupabase(env, userId)
    return { ok: true, creditsAfter: credits }
  }
  const credits = await getCreditsFromSupabase(env, userId)
  if (credits < amount) return { ok: false, reason: 'insufficient', credits }
  const after = Math.max(0, credits - amount)
  await setCreditsInSupabase(env, userId, after)
  await mirrorCreditsToD1(db, userId, after)
  return { ok: true, creditsAfter: after }
}

