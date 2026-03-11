import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../lib/supabase'
import Replicate from 'replicate'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
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

const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply) => {
    try {
      const supabase = getSupabaseClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return reply.code(401).send({ ok: false, error: 'Unauthorized' })

      const { data: pricing } = await supabase.from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', 'pose').maybeSingle()
      const creditsPerUse = pricing?.credits_per_use ?? 0
      const { data: userRow } = await supabase.from('users').select('credits').eq('id', user.id).single()
      if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
        return reply.code(402).send({ ok: false, error: 'Credit tidak cukup' })
      }
      if (!REPLICATE_API_TOKEN) return reply.code(500).send({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' })

      const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
      const body = request.body || {}
      if (!body.subject) return reply.code(400).send({ ok: false, error: 'File foto karakter wajib' })

      const output = await replicate.run(`${POSE_MODEL}:${POSE_VERSION}` as any, {
        input: { prompt: body.prompt || 'A headshot photo', subject: body.subject, output_format: body.output_format || 'webp', output_quality: 80, number_of_outputs: Math.min(Math.max(body.number_of_outputs || 3, 1), 3), randomise_poses: body.randomise_poses !== false, number_of_images_per_pose: Math.min(Math.max(body.number_of_images_per_pose || 1, 1), 4) },
      })
      const results = getOutputUrls(output)
      if (!results.length) return reply.code(500).send({ ok: false, error: 'Tidak ada hasil' })

      if (creditsPerUse > 0) {
        const { data: latest } = await supabase.from('users').select('credits').eq('id', user.id).single()
        await supabase.from('users').update({ credits: Math.max((latest?.credits ?? 0) - creditsPerUse, 0) }).eq('id', user.id)
      }
      return reply.send({ ok: true, results })
    } catch (err: any) {
      console.error('Pose error:', err)
      return reply.code(500).send({ ok: false, error: err?.message || 'Gagal' })
    }
  })
}

export default route
