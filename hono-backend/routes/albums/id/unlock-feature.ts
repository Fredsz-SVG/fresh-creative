import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getD1 } from '../../../lib/edge-env'
import { parseJsonArray } from '../../../lib/d1-json'

const albumsIdUnlockFeature = new Hono()

// GET /api/albums/:id/unlock-feature
albumsIdUnlockFeature.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const albumId = c.req.param('id')

  // Satu query untuk baris user + album, plus baris flipbook tingkat album (OR); paket & pricing global dijalankan paralel.
  const [unlockBlock, albumRow, fpRowsResult] = await Promise.all([
    db
      .prepare(
        `SELECT feature_type, credits_spent, unlocked_at, user_id FROM feature_unlocks
         WHERE album_id = ? AND (user_id = ? OR feature_type = 'flipbook')`
      )
      .bind(albumId, user.id)
      .all<{ feature_type: string; credits_spent: number; unlocked_at: string; user_id: string }>(),
    db
      .prepare(
        `SELECT a.pricing_package_id, a.user_id, p.flipbook_enabled, p.ai_labs_features
         FROM albums a
         LEFT JOIN pricing_packages p ON p.id = a.pricing_package_id
         WHERE a.id = ?`
      )
      .bind(albumId)
      .first<{
        pricing_package_id: string | null
        user_id: string
        flipbook_enabled: number | null
        ai_labs_features: string | null
      }>(),
    db
      .prepare(`SELECT feature_slug, credits_per_unlock FROM ai_feature_pricing`)
      .all<{ feature_slug: string; credits_per_unlock: number }>(),
  ])

  const raw = unlockBlock.results ?? []
  const u = raw
    .filter((r) => r.user_id === user.id)
    .map(({ feature_type, credits_spent, unlocked_at }) => ({
      feature_type,
      credits_spent,
      unlocked_at,
    }))
  const unlockedFeatures = u.map((x) => x.feature_type)
  const flipbook_unlocked_on_album = raw.some((r) => r.feature_type === 'flipbook')

  const album = albumRow
  let flipbookEnabledByPackage = false
  let aiLabsFeaturesByPackage: string[] = []
  if (album?.pricing_package_id) {
    flipbookEnabledByPackage = (album?.flipbook_enabled ?? 0) === 1
    aiLabsFeaturesByPackage = parseJsonArray(album?.ai_labs_features) as string[]
  }

  const creditCosts: Record<string, number> = {}
  for (const fp of fpRowsResult.results ?? []) {
    creditCosts[fp.feature_slug] = fp.credits_per_unlock
  }

  return c.json({
    unlocks: u,
    unlocked_features: unlockedFeatures,
    flipbook_enabled_by_package: flipbookEnabledByPackage,
    flipbook_unlocked_on_album,
    ai_labs_features_by_package: aiLabsFeaturesByPackage,
    is_owner: album?.user_id === user.id,
    credit_costs: creditCosts,
  })
})

// POST /api/albums/:id/unlock-feature
albumsIdUnlockFeature.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const featureType = body?.feature_type
  if (!albumId || !featureType || typeof featureType !== 'string') {
    return c.json({ error: 'feature_type required' }, 400)
  }

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const isOwner = album.user_id === user.id
  if (!isOwner) {
    const member = await db
      .prepare(
        `SELECT role FROM album_members WHERE album_id = ? AND user_id = ? AND role = 'admin'`
      )
      .bind(albumId, user.id)
      .first<{ role: string }>()
    if (!member) {
      return c.json({ error: 'Hanya pemilik atau admin album yang dapat membuka fitur.' }, 403)
    }
  }

  const existing = await db
    .prepare(
      `SELECT id FROM feature_unlocks WHERE user_id = ? AND album_id = ? AND feature_type = ?`
    )
    .bind(user.id, albumId, featureType)
    .first<{ id: string }>()
  if (existing) return c.json({ error: 'Fitur sudah dibuka sebelumnya.' }, 409)

  const featureSlug = featureType === 'flipbook' ? 'flipbook_unlock' : featureType
  const pricing = await db
    .prepare(`SELECT credits_per_unlock FROM ai_feature_pricing WHERE feature_slug = ?`)
    .bind(featureSlug)
    .first<{ credits_per_unlock: number }>()
  const cost = pricing?.credits_per_unlock ?? 0
  if (cost <= 0) return c.json({ error: 'Fitur tidak dapat dibuka dengan credit.' }, 400)

  const userRow = await db
    .prepare(`SELECT credits FROM users WHERE id = ?`)
    .bind(user.id)
    .first<{ credits: number | null }>()
  const credits = userRow?.credits ?? 0
  if (credits < cost) {
    return c.json({ error: 'Credit tidak cukup. Silakan top up terlebih dahulu.' }, 402)
  }

  const unlockedAt = new Date().toISOString()
  const fid = crypto.randomUUID()
  const ins = await db
    .prepare(
      `INSERT INTO feature_unlocks (id, user_id, album_id, feature_type, credits_spent, unlocked_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(fid, user.id, albumId, featureType, cost, unlockedAt)
    .run()
  if (!ins.success) return c.json({ error: 'Insert failed' }, 500)

  const upd = await db
    .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(Math.max(0, credits - cost), user.id)
    .run()
  if (!upd.success) return c.json({ error: 'Gagal memotong credit.' }, 500)
  return c.json({ ok: true, unlocked_at: unlockedAt })
})

export default albumsIdUnlockFeature
