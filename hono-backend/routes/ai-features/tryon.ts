import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { arrayBufferToBase64, fileToDataUri, formDataString, requestIsMultipart } from '../../lib/ai-multipart'
import { getSingleReplicateUrl } from '../../lib/replicate-output'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import Replicate from 'replicate'

const IDM_VTON_MODEL = 'cuuupid/idm-vton'
const IDM_VTON_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type TryOnBody = {
  human_img?: string
  garm_img?: string
  garment_des?: string
  category?: string
  steps?: number
  crop?: boolean
  seed?: number
  force_dc?: boolean
  mask_only?: boolean
  garments?: string[]
  mode?: string
} & Record<string, unknown>

async function processSingleGarment(
  replicate: InstanceType<typeof Replicate>,
  humanImg: string,
  garmImg: string,
  garmentDes = '',
  category = 'upper_body',
  steps = 30,
  crop = false,
  seed = 42,
  forceDc = false,
  maskOnly = false
): Promise<string> {
  const output = await replicate.run(`${IDM_VTON_MODEL}:${IDM_VTON_VERSION}`, {
    input: { human_img: humanImg, garm_img: garmImg, garment_des: garmentDes, category, steps, crop, seed, force_dc: forceDc, mask_only: maskOnly },
  })
  const url = getSingleReplicateUrl(output)
  if (!url) throw new Error('Invalid try-on output')
  return url
}

async function parseTryOnBody(c: Context): Promise<TryOnBody> {
  if (!requestIsMultipart(c)) {
    const raw = await c.req.json().catch(() => ({}))
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as TryOnBody) : {}
  }
  const fd = await c.req.formData()
  const human: unknown = fd.get('human_img')
  let human_img = ''
  if (human instanceof File && human.size > 0) {
    human_img = await fileToDataUri(human)
  }
  const garm: unknown = fd.get('garm_img')
  let garm_img: string | undefined
  if (garm instanceof File && garm.size > 0) {
    garm_img = await fileToDataUri(garm)
  }
  const rawGarments = fd.getAll('garments') as unknown[]
  const garmentFiles = rawGarments.filter((x): x is File => x instanceof File && x.size > 0)
  const garments = await Promise.all(garmentFiles.map((f) => fileToDataUri(f)))
  const mode = fd.get('mode')
  const crop = fd.get('crop')
  const stepsStr = fd.get('steps')
  const seedStr = fd.get('seed')
  const maskOnly = fd.get('mask_only')
  const forceDc = fd.get('force_dc')
  let steps = 30
  if (typeof stepsStr === 'string' && stepsStr.trim() !== '') {
    const n = parseInt(stepsStr, 10)
    if (!Number.isNaN(n)) steps = n
  }
  let seed = 42
  if (typeof seedStr === 'string' && seedStr.trim() !== '') {
    const n = parseInt(seedStr, 10)
    if (!Number.isNaN(n)) seed = n
  }
  const out: TryOnBody = {
    human_img,
    garment_des: formDataString(fd, 'garment_des') || '',
    category: formDataString(fd, 'category') || 'upper_body',
    steps,
    crop: crop === 'true',
    seed,
    force_dc: forceDc === 'true',
    mask_only: maskOnly === 'true',
    mode: typeof mode === 'string' ? mode : undefined,
  }
  if (garm_img) out.garm_img = garm_img
  if (garments.length) out.garments = garments
  for (let i = 0; i < 4; i++) {
    const val = formDataString(fd, `category_${i}`)
    if (val) out[`category_${i}`] = val
  }
  return out
}

const tryon = new Hono()

// POST /api/ai-features/tryon
tryon.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)

    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('tryon')
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
    const body = await parseTryOnBody(c)

    if (!body.human_img) return c.json({ ok: false, error: 'File manusia tidak valid' }, 400)
    if (body.garm_img) {
      const result = await processSingleGarment(
        replicate,
        body.human_img,
        body.garm_img,
        body.garment_des || '',
        body.category || 'upper_body',
        Math.min(Math.max(body.steps || 30, 1), 40),
        body.crop === true,
        body.seed ?? 42,
        body.force_dc === true,
        body.mask_only === true
      )
      return c.json({ ok: true, results: [result] })
    }
    const garments = Array.isArray(body.garments) ? body.garments.filter((g): g is string => typeof g === 'string') : []
    if (!garments?.length) return c.json({ ok: false, error: 'Minimal 1 garment' }, 400)
    if (garments.length > 2) return c.json({ ok: false, error: 'Maksimal 2 garments' }, 400)

    const results: string[] = []
    if (body.mode === 'chain') {
      let cur = body.human_img
      for (let i = 0; i < garments.length; i++) {
        const category =
          typeof body[`category_${i}`] === 'string' ? String(body[`category_${i}`]) : 'upper_body'
        const r = await processSingleGarment(replicate, cur, garments[i], `Garment ${i + 1}`, category)
        if (i < garments.length - 1) {
          const res = await fetch(r)
          const buffer = await res.arrayBuffer()
          cur = 'data:image/jpeg;base64,' + arrayBufferToBase64(buffer)
        } else {
          results.push(r)
        }
      }
    } else {
      results.push(
        ...(await Promise.all(
          garments.map((g: string, i: number) => {
            const category =
              typeof body[`category_${i}`] === 'string' ? String(body[`category_${i}`]) : 'upper_body'
            return processSingleGarment(replicate, body.human_img || '', g, `Garment ${i + 1}`, category)
          })
        ))
      )
    }
    return c.json({ ok: true, results })
  } catch (err: unknown) {
    console.error('Try-on error:', err)
    const message = err instanceof Error ? err.message : 'Gagal'
    return c.json({ ok: false, error: message }, 500)
  }
})

export default tryon
