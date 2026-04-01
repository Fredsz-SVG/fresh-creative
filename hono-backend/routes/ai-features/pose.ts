import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { getUserRow } from '../../lib/d1-users'
import Replicate from 'replicate'

const POSE_MODEL = 'sdxl-based/consistent-character'
const POSE_VERSION = '9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type UrlLike = {
  url?: string | (() => string)
}

type PoseBody = {
  subject?: string
  prompt?: string
  output_format?: string
  number_of_outputs?: number
  randomise_poses?: boolean
  number_of_images_per_pose?: number
}

function getOutputUrls(output: unknown): string[] {
  if (!Array.isArray(output)) return []
  return output.map((item: unknown) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && 'url' in item) {
      const url = (item as UrlLike).url
      return typeof url === 'function' ? url() : typeof url === 'string' ? url : ''
    }
    return ''
  }).filter(Boolean)
}

const pose = new Hono()

// POST /api/ai-features/pose
pose.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)

    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('pose')
      .first<{ credits_per_use: number }>()
    const creditsPerUse = pricing?.credits_per_use ?? 0
    const userRow = await getUserRow(db, user.id)
    if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
      return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }

    const REPLICATE_API_TOKEN = (c.env as ReplicateEnv).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    const body = (await c.req.json().catch(() => ({}))) as PoseBody
    if (!body.subject) return c.json({ ok: false, error: 'File foto karakter wajib' }, 400)

    const output = await replicate.run(`${POSE_MODEL}:${POSE_VERSION}`, {
      input: {
        prompt: body.prompt || 'A headshot photo',
        subject: body.subject,
        output_format: body.output_format || 'webp',
        output_quality: 80,
        number_of_outputs: Math.min(Math.max(body.number_of_outputs || 3, 1), 3),
        randomise_poses: body.randomise_poses !== false,
        number_of_images_per_pose: Math.min(Math.max(body.number_of_images_per_pose || 1, 1), 4)
      },
    })
    const results = getOutputUrls(output)
    if (!results.length) return c.json({ ok: false, error: 'Tidak ada hasil' }, 500)

    if (creditsPerUse > 0) {
      const latest = await getUserRow(db, user.id)
      await db
        .prepare(`UPDATE users SET credits = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(Math.max((latest?.credits ?? 0) - creditsPerUse, 0), user.id)
        .run()
    }
    return c.json({ ok: true, results })
  } catch (err: unknown) {
    console.error('Pose error:', err)
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Gagal' }, 500)
  }
})

export default pose
