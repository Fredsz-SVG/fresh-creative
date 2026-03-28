import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import Replicate from 'replicate'

const POSE_MODEL = 'sdxl-based/consistent-character'
const POSE_VERSION = '9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772'

function getOutputUrls(output: unknown): string[] {
  if (!Array.isArray(output)) return []
  return output.map((item: any) => {
    if (typeof item === 'string') return item
    if (item?.url) return typeof item.url === 'function' ? item.url() : item.url
    return ''
  }).filter(Boolean)
}

const pose = new Hono()

// POST /api/ai-features/pose
pose.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)

    const { data: pricing } = await supabase.from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', 'pose').maybeSingle()
    const creditsPerUse = pricing?.credits_per_use ?? 0
    const { data: userRow } = await supabase.from('users').select('credits').eq('id', user.id).single()
    if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
      return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }

    const REPLICATE_API_TOKEN = (c.env as any).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    const body = await c.req.json().catch(() => ({}))
    if (!body.subject) return c.json({ ok: false, error: 'File foto karakter wajib' }, 400)

    const output = await replicate.run(`${POSE_MODEL}:${POSE_VERSION}` as any, {
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
      const { data: latest } = await supabase.from('users').select('credits').eq('id', user.id).single()
      await supabase.from('users').update({ credits: Math.max((latest?.credits ?? 0) - creditsPerUse, 0) }).eq('id', user.id)
    }
    return c.json({ ok: true, results })
  } catch (err: any) {
    console.error('Pose error:', err)
    return c.json({ ok: false, error: err?.message || 'Gagal' }, 500)
  }
})

export default pose
