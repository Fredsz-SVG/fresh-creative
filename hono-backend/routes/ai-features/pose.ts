import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, requestIsMultipart } from '../../lib/ai-multipart'
import { normalizeReplicateOutputToUrls } from '../../lib/replicate-output'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import Replicate from 'replicate'

const POSE_MODEL = 'sdxl-based/consistent-character'
const POSE_VERSION = '9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type PoseBody = {
  subject?: string
  prompt?: string
  output_format?: string
  number_of_outputs?: number
  randomise_poses?: boolean
  number_of_images_per_pose?: number
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
    if (creditsPerUse > 0) {
      const r = await deductCreditsFromSupabaseAndMirrorToD1({
        env: c.env as Record<string, string>,
        db,
        userId: user.id,
        amount: creditsPerUse,
      })
      if (!r.ok) return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }

    const REPLICATE_API_TOKEN = (c.env as ReplicateEnv).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    let body: PoseBody
    if (requestIsMultipart(c)) {
      const fd = await c.req.formData()
      const subjectFile: unknown = fd.get('subject')
      if (!(subjectFile instanceof File) || subjectFile.size === 0) {
        return c.json({ ok: false, error: 'File foto karakter wajib' }, 400)
      }
      const prompt = fd.get('prompt')
      body = {
        subject: await fileToDataUri(subjectFile),
        prompt: typeof prompt === 'string' ? prompt : undefined,
      }
    } else {
      body = (await c.req.json().catch(() => ({}))) as PoseBody
    }
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
    const results = normalizeReplicateOutputToUrls(output)
    if (!results.length) return c.json({ ok: false, error: 'Tidak ada hasil' }, 500)

    return c.json({ ok: true, results })
  } catch (err: unknown) {
    console.error('Pose error:', err)
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Gagal' }, 500)
  }
})

export default pose
