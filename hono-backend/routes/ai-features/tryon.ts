import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, formDataString, requestIsMultipart } from '../../lib/ai-multipart'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import { generateVirtualTryOnGemini, imageStringToGeminiInput } from '../../lib/gemini-tryon'
import Replicate from 'replicate'

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
  const out: TryOnBody = {
    human_img,
    garment_des: formDataString(fd, 'garment_des') || '',
    category: formDataString(fd, 'category') || 'upper_body',
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

const MAX_GARMENTS = 3

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

    const REPLICATE_API_TOKEN = ((c.env as ReplicateEnv).REPLICATE_API_TOKEN || '').trim()
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })

    const body = await parseTryOnBody(c)

    if (!body.human_img) return c.json({ ok: false, error: 'File manusia tidak valid' }, 400)

    let itemsCount = 1
    const garments = Array.isArray(body.garments) ? body.garments.filter((g): g is string => typeof g === 'string') : []
    
    if (!body.garm_img) {
      if (!garments.length) return c.json({ ok: false, error: 'Minimal 1 garment' }, 400)
      if (garments.length > MAX_GARMENTS) {
        return c.json({ ok: false, error: `Maksimal ${MAX_GARMENTS} garments` }, 400)
      }
      itemsCount = garments.length
    }

    const pricing = await db
      .prepare(`SELECT credits_per_use FROM ai_feature_pricing WHERE feature_slug = ?`)
      .bind('tryon')
      .first<{ credits_per_use: number }>()
    
    const creditsPerUse = pricing?.credits_per_use ?? 0
    const totalCreditsNeeded = creditsPerUse * itemsCount

    if (totalCreditsNeeded > 0) {
      const r = await deductCreditsFromSupabaseAndMirrorToD1({
        env: c.env as Record<string, string>,
        db,
        userId: user.id,
        amount: totalCreditsNeeded,
      })
      if (!r.ok) return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }

    const person0 = await imageStringToGeminiInput(body.human_img)
    if (!person0) return c.json({ ok: false, error: 'Gambar orang tidak valid' }, 400)

    if (body.garm_img) {
      const cloth = await imageStringToGeminiInput(body.garm_img)
      if (!cloth) return c.json({ ok: false, error: 'Gambar garment tidak valid' }, 400)
      const result = await generateVirtualTryOnGemini(replicate, person0, cloth)
      return c.json({ ok: true, results: [result] })
    }

    if (body.mode === 'chain') {
      let curPerson = person0
      let finalResult = ''
      for (let i = 0; i < garments.length; i++) {
        const cloth = await imageStringToGeminiInput(garments[i])
        if (!cloth) return c.json({ ok: false, error: `Gambar garment ${i + 1} tidak valid` }, 400)
        finalResult = await generateVirtualTryOnGemini(replicate, curPerson, cloth)
        if (i < garments.length - 1) {
          const next = await imageStringToGeminiInput(finalResult)
          if (!next) return c.json({ ok: false, error: 'Gagal memproses hasil intermediate' }, 500)
          curPerson = next
        }
      }
      return c.json({ ok: true, results: [finalResult] })
    }

    const results = await Promise.all(
      garments.map(async (g, i) => {
        const cloth = await imageStringToGeminiInput(g)
        if (!cloth) throw new Error(`Gambar garment ${i + 1} tidak valid`)
        return generateVirtualTryOnGemini(replicate, person0, cloth)
      })
    )
    return c.json({ ok: true, results })
  } catch (err: unknown) {
    console.error('Try-on error:', err)
    const message = err instanceof Error ? err.message : String(err ?? 'Gagal')

    // Jika error berasal dari Replicate SDK, biasanya ada status di err.response.status atau err.status.
    const e = err as { response?: { status?: number }; status?: number }
    let status: number | undefined = e?.response?.status ?? e?.status

    // Replicate sering menyisipkan JSON error di akhir message: "...: {\"detail\":...,\"status\":429,...}"
    // Coba parse agar kita bisa mapping status lebih akurat.
    let parsed: { status?: number; retry_after?: number; detail?: string } | null = null
    if (typeof message === 'string') {
      const idx = message.lastIndexOf('{')
      if (idx !== -1) {
        const tail = message.slice(idx)
        try {
          const j = JSON.parse(tail) as { status?: number; retry_after?: number; detail?: string }
          if (j && typeof j === 'object') parsed = j
          if (typeof j?.status === 'number') status = j.status
        } catch {
          // ignore
        }
      }
    }

    // Replicate throttling (saldo < $5 => RPM rendah).
    if (status === 429 || (typeof message === 'string' && message.includes('Too Many Requests'))) {
      const retryAfter =
        typeof parsed?.retry_after === 'number'
          ? parsed.retry_after
          : (() => {
              const m = /"retry_after"\s*:\s*(\d+)/.exec(message)
              return m ? parseInt(m[1], 10) : undefined
            })()
      const hint =
        typeof retryAfter === 'number' && !Number.isNaN(retryAfter) && retryAfter > 0
          ? `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.`
          : 'Terlalu banyak request. Coba lagi beberapa detik lagi.'
      return c.json({ ok: false, error: hint, retry_after: retryAfter }, 429)
    }

    // Teruskan status 4xx yang jelas ke client (mis. input salah, unauthorized, dll.)
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return c.json({ ok: false, error: message }, status as ContentfulStatusCode)
    }

    // Error upstream (Replicate/model error) → 502 lebih akurat daripada 500.
    if (
      (typeof status === 'number' && status >= 500) ||
      (typeof message === 'string' &&
        (message.toLowerCase().includes('prediction failed') || message.toLowerCase().includes('replicate')))
    ) {
      const detail =
        (typeof parsed?.detail === 'string' && parsed.detail.trim()) ? parsed.detail.trim() : message
      return c.json({ ok: false, error: detail }, 502)
    }

    return c.json({ ok: false, error: message }, 500)
  }
})

export default tryon
