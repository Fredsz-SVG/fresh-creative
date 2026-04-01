import { Hono } from 'hono'
import Replicate from 'replicate'

const IDM_VTON_MODEL = 'cuuupid/idm-vton'
const IDM_VTON_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type UrlLike = {
  url?: string | (() => string)
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

function getOutputUrl(output: unknown): string {
  if (typeof output === 'string') return output
  if (output && typeof output === 'object' && 'url' in output) {
    const u = (output as UrlLike).url
    return typeof u === 'function' ? u() : typeof u === 'string' ? u : ''
  }
  throw new Error('Invalid try-on output')
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function processSingleGarment(
  replicate: InstanceType<typeof Replicate>, humanImg: string, garmImg: string,
  garmentDes = '', category = 'upper_body', steps = 30,
  crop = false, seed = 42, forceDc = false, maskOnly = false
): Promise<string> {
  const output = await replicate.run(`${IDM_VTON_MODEL}:${IDM_VTON_VERSION}`, {
    input: { human_img: humanImg, garm_img: garmImg, garment_des: garmentDes, category, steps, crop, seed, force_dc: forceDc, mask_only: maskOnly },
  })
  return getOutputUrl(output)
}

const tryon = new Hono()

// POST /api/ai-features/tryon
tryon.post('/', async (c) => {
  try {
    const REPLICATE_API_TOKEN = (c.env as ReplicateEnv).REPLICATE_API_TOKEN || ''
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)
    
    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })
    const rawBody = await c.req.json().catch(() => ({}))
    const body = (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {}) as TryOnBody

    if (!body.human_img) return c.json({ ok: false, error: 'File manusia tidak valid' }, 400)
    if (body.garm_img) {
      const result = await processSingleGarment(
        replicate, body.human_img, body.garm_img, body.garment_des || '', 
        body.category || 'upper_body', Math.min(Math.max(body.steps || 30, 1), 40), 
        body.crop === true, body.seed ?? 42, body.force_dc === true, body.mask_only === true
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
        const category = typeof body[`category_${i}`] === 'string' ? String(body[`category_${i}`]) : 'upper_body'
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
      results.push(...(await Promise.all(garments.map((g: string, i: number) => {
        const category = typeof body[`category_${i}`] === 'string' ? String(body[`category_${i}`]) : 'upper_body'
        return processSingleGarment(replicate, body.human_img || '', g, `Garment ${i + 1}`, category)
      }))))
    }
    return c.json({ ok: true, results })
  } catch (err: unknown) {
    console.error('Try-on error:', err)
    const message = err instanceof Error ? err.message : 'Gagal'
    return c.json({ ok: false, error: message }, 500)
  }
})

export default tryon
