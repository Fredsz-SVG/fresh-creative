import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, formDataString, requestIsMultipart } from '../../lib/ai-multipart'
import { getSingleReplicateUrl } from '../../lib/replicate-output'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import Replicate from 'replicate'


const PHOTO_GROUP_MODEL = 'flux-kontext-apps/multi-image-list'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type PhotoGroupBody = {
  subjects?: string[]
  prompt?: string
  aspect_ratio?: string
  output_format?: string
}

const photogroup = new Hono()

photogroup.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)
    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('photogroup')
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
    let body: PhotoGroupBody
    if (requestIsMultipart(c)) {
      const fd = await c.req.formData()
      const rawSubjects = fd.getAll('subjects') as unknown[]
      const files = rawSubjects.filter((x): x is File => x instanceof File && x.size > 0)
      const prompt = fd.get('prompt')
      const uris = await Promise.all(files.map((f) => fileToDataUri(f)))
      body = {
        subjects: uris,
        prompt: typeof prompt === 'string' ? prompt : undefined,
        aspect_ratio: formDataString(fd, 'aspect_ratio'),
        output_format: formDataString(fd, 'output_format'),
      }
    } else {
      body = (await c.req.json().catch(() => ({}))) as PhotoGroupBody
    }
    const subjects = Array.isArray(body.subjects) ? body.subjects.filter((s): s is string => typeof s === 'string') : []
    if (!subjects || !Array.isArray(subjects) || subjects.length < 2) return c.json({ ok: false, error: 'Minimal 2 gambar' }, 400)
    if (subjects.length > 10) return c.json({ ok: false, error: 'Maksimal 10 gambar' }, 400)
    if (!(body.prompt || '').trim()) return c.json({ ok: false, error: 'Prompt wajib diisi!' }, 400)
    const output = await replicate.run(PHOTO_GROUP_MODEL, { input: { prompt: body.prompt, aspect_ratio: body.aspect_ratio || 'match_input_image', input_images: subjects, output_format: body.output_format || 'png', safety_tolerance: 2 } })
    const result = getSingleReplicateUrl(output)
    if (!result) return c.json({ ok: false, error: 'Tidak ada hasil' }, 500)
    return c.json({ ok: true, result })
  } catch (err: unknown) {
    console.error('Photo Group error:', err)
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Gagal' }, 500)
  }
})

export default photogroup
