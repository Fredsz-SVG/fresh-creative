import type { D1Database } from '@cloudflare/workers-types'
import { ensureUserStubInD1 } from './d1-users'

export async function getCreditsFromD1(db: D1Database, userId: string): Promise<number> {
  await ensureUserStubInD1(db, userId)
  const row = await db
    .prepare(`SELECT credits FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ credits: number | null }>()
  const credits = row?.credits ?? 0
  return typeof credits === 'number' ? credits : 0
}

export async function setCreditsInD1(db: D1Database, userId: string, credits: number): Promise<void> {
  await ensureUserStubInD1(db, userId)
  await db
    .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(credits, userId)
    .run()
}

/**
 * Deduct credits from D1.
 * Best-effort atomicity: single UPDATE with guard `credits >= amount`.
 */
export async function deductCreditsFromD1(opts: {
  db: D1Database
  userId: string
  amount: number
}): Promise<
  { ok: true; creditsAfter: number } | { ok: false; reason: 'insufficient'; credits: number }
> {
  const { db, userId, amount } = opts
  if (amount <= 0) {
    const credits = await getCreditsFromD1(db, userId)
    return { ok: true, creditsAfter: credits }
  }

  await ensureUserStubInD1(db, userId)
  const r = await db
    .prepare(
      `UPDATE users
       SET credits = credits - ?, updated_at = datetime('now')
       WHERE id = ? AND COALESCE(credits, 0) >= ?`
    )
    .bind(amount, userId, amount)
    .run()

  if (!r.success || (r.meta?.changes ?? 0) === 0) {
    const credits = await getCreditsFromD1(db, userId)
    return { ok: false, reason: 'insufficient', credits }
  }

  const creditsAfter = await getCreditsFromD1(db, userId)
  return { ok: true, creditsAfter }
}
