import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, requestIsMultipart } from '../../lib/ai-multipart'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import { imageStringToGeminiInput } from '../../lib/gemini-tryon'
import { generatePoseEditGemini } from '../../lib/gemini-pose'
import { respondWithReplicateFriendlyError } from '../../lib/replicate-error-response'
import Replicate from 'replicate'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type PoseBody = {
  subject?: string
  prompt?: string
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

    const REPLICATE_API_TOKEN = ((c.env as ReplicateEnv).REPLICATE_API_TOKEN || '').trim()
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

    const subjectInput = await imageStringToGeminiInput(body.subject)
    if (!subjectInput) return c.json({ ok: false, error: 'Gambar subject tidak valid' }, 400)

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

    const url = await generatePoseEditGemini(replicate, subjectInput, body.prompt || '')

    return c.json({ ok: true, results: [url] })
  } catch (err: unknown) {
    return respondWithReplicateFriendlyError(c, err, 'Pose error')
  }
})

export default pose
