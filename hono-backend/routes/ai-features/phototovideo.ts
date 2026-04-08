import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, requestIsMultipart } from '../../lib/ai-multipart'
import { getSingleReplicateUrl } from '../../lib/replicate-output'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import Replicate from 'replicate'



const PHOTO_TO_VIDEO_MODEL = 'wan-video/wan-2.2-i2v-fast'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type PhotoToVideoBody = {
  image?: string
  prompt?: string
}

const phototovideo = new Hono()

phototovideo.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)
    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('phototovideo')
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
    let body: PhotoToVideoBody
    if (requestIsMultipart(c)) {
      const fd = await c.req.formData()
      const photo: unknown = fd.get('photo')
      const prompt = fd.get('prompt')
      if (!(photo instanceof File) || photo.size === 0) {
        return c.json({ ok: false, error: 'File foto tidak valid' }, 400)
      }
      body = {
        image: await fileToDataUri(photo),
        prompt: typeof prompt === 'string' ? prompt : undefined,
      }
    } else {
      body = (await c.req.json().catch(() => ({}))) as PhotoToVideoBody
    }
    if (!body.image) return c.json({ ok: false, error: 'File foto tidak valid' }, 400)
    const output = await replicate.run(PHOTO_TO_VIDEO_MODEL, { input: { image: body.image, prompt: body.prompt || 'A cinematic video', go_fast: true, num_frames: 81, resolution: '480p', sample_shift: 12, frames_per_second: 16 } })
    const videoUrl = getSingleReplicateUrl(output)
    if (!videoUrl) return c.json({ ok: false, error: 'Tidak ada hasil video' }, 500)
    return c.json({ ok: true, video: videoUrl })
  } catch (err: unknown) {
    console.error('Photo to Video error:', err)
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Gagal' }, 500)
  }
})

export default phototovideo
