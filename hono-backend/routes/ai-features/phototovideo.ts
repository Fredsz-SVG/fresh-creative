import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import Replicate from 'replicate'



const PHOTO_TO_VIDEO_MODEL = 'wan-video/wan-2.2-i2v-fast'

function getOutputUrl(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object' && 'url' in output) {
    const u = (output as any).url
    return typeof u === 'function' ? u() : typeof u === 'string' ? u : ''
  }
  return ''
}

const phototovideo = new Hono()

phototovideo.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)
    const { data: pricing } = await supabase.from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', 'phototovideo').maybeSingle()
    const creditsPerUse = pricing?.credits_per_use ?? 0
    const { data: userRow } = await supabase.from('users').select('credits').eq('id', user.id).single()
    if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
      return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }
    const REPLICATE_API_TOKEN = (c.env as any).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)


    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    const body = await c.req.json()
    if (!body.image) return c.json({ ok: false, error: 'File foto tidak valid' }, 400)
    const output = await replicate.run(PHOTO_TO_VIDEO_MODEL as any, { input: { image: body.image, prompt: body.prompt || 'A cinematic video', go_fast: true, num_frames: 81, resolution: '480p', sample_shift: 12, frames_per_second: 16 } })
    const videoUrl = getOutputUrl(output)
    if (!videoUrl) return c.json({ ok: false, error: 'Tidak ada hasil video' }, 500)
    if (creditsPerUse > 0) {
      const { data: latest } = await supabase.from('users').select('credits').eq('id', user.id).single()
      await supabase.from('users').update({ credits: Math.max((latest?.credits ?? 0) - creditsPerUse, 0) }).eq('id', user.id)
    }
    return c.json({ ok: true, video: videoUrl })
  } catch (err: any) {
    console.error('Photo to Video error:', err)
    return c.json({ ok: false, error: err?.message || 'Gagal' }, 500)
  }
})

export default phototovideo
