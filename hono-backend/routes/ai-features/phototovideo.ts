import { Hono } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getD1 } from '../../lib/edge-env'
import { fileToDataUri, requestIsMultipart } from '../../lib/ai-multipart'
import { deductCreditsFromSupabaseAndMirrorToD1 } from '../../lib/credits'
import {
  buildPhotoToVideoPrompt,
  runSeedanceImageToVideo,
  runKlingLipSync,
  SEEDANCE_RESOLUTION_FOR_LIPSYNC,
  SEEDANCE_RESOLUTION_LITE,
  validateAudioFileSize,
} from '../../lib/replicate-phototovideo'
import {
  creditsForPhotoToVideoDuration,
  normalizePhotoToVideoDuration,
} from '../../lib/phototovideo-pricing'
import { respondWithReplicateFriendlyError } from '../../lib/replicate-error-response'
import Replicate from 'replicate'

type ReplicateEnv = {
  REPLICATE_API_TOKEN?: string
}

type PhotoToVideoBody = {
  image?: string
  prompt?: string
  duration?: number
  audio?: string
}

const phototovideo = new Hono()

phototovideo.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ ok: false, error: 'Database not configured' }, 503)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ ok: false, error: 'Unauthorized' }, 401)

    const REPLICATE_API_TOKEN = ((c.env as ReplicateEnv).REPLICATE_API_TOKEN || '').trim()
    if (!REPLICATE_API_TOKEN) return c.json({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' }, 500)
    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })

    let body: PhotoToVideoBody
    if (requestIsMultipart(c)) {
      const fd = await c.req.formData()
      const photo: unknown = fd.get('photo')
      const prompt = fd.get('prompt')
      const durationRaw = fd.get('duration')
      const audioFile: unknown = fd.get('audio')
      if (!(photo instanceof File) || photo.size === 0) {
        return c.json({ ok: false, error: 'File foto tidak valid' }, 400)
      }
      let audioUri: string | undefined
      if (audioFile instanceof File && audioFile.size > 0) {
        if (!validateAudioFileSize(audioFile.size)) {
          return c.json({ ok: false, error: 'File audio maksimal 5MB (syarat model lip-sync).' }, 400)
        }
        const mime = (audioFile.type || '').toLowerCase()
        const okByExt = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(audioFile.name)
        if (!mime.startsWith('audio/') && !okByExt) {
          return c.json({ ok: false, error: 'Format audio didukung: mp3, wav, m4a, aac, ogg.' }, 400)
        }
        audioUri = await fileToDataUri(audioFile)
      }
      const rawDur =
        typeof durationRaw === 'string' ? parseInt(durationRaw, 10) : Number(durationRaw)
      const durationParsed = Number.isFinite(rawDur) ? rawDur : 5
      body = {
        image: await fileToDataUri(photo),
        prompt: typeof prompt === 'string' ? prompt : undefined,
        duration: durationParsed,
        audio: audioUri,
      }
    } else {
      body = (await c.req.json().catch(() => ({}))) as PhotoToVideoBody
    }

    if (body.duration === undefined || body.duration === null || !Number.isFinite(Number(body.duration))) {
      body.duration = 5
    }

    if (!body.image) return c.json({ ok: false, error: 'File foto tidak valid' }, 400)
    const hasAudio = typeof body.audio === 'string' && body.audio.length > 0

    const motionPrompt = buildPhotoToVideoPrompt(body.prompt || '')

    /** Tanpa audio: resolusi lite. Dengan audio: 720p agar kompatibel Kling lip-sync. */
    const resolution = hasAudio ? SEEDANCE_RESOLUTION_FOR_LIPSYNC : SEEDANCE_RESOLUTION_LITE

    const pricing = await db
      .prepare(
        `SELECT credits_per_use, duration_credits_json FROM ai_feature_pricing WHERE feature_slug = ?`
      )
      .bind('phototovideo')
      .first<{ credits_per_use: number; duration_credits_json: string | null }>()
    const row = {
      credits_per_use: pricing?.credits_per_use ?? 0,
      duration_credits_json: pricing?.duration_credits_json ?? null,
    }

    const dur = normalizePhotoToVideoDuration(body.duration, row)
    if (dur.ok === false) return c.json({ ok: false, error: dur.error }, 400)
    const durationSec = dur.seconds

    const creditsPerUse = creditsForPhotoToVideoDuration(durationSec, row)
    if (creditsPerUse > 0) {
      const r = await deductCreditsFromSupabaseAndMirrorToD1({
        env: c.env as Record<string, string>,
        db,
        userId: user.id,
        amount: creditsPerUse,
      })
      if (!r.ok) return c.json({ ok: false, error: 'Credit tidak cukup' }, 402)
    }

    let videoUrl = await runSeedanceImageToVideo(
      replicate,
      body.image,
      motionPrompt,
      durationSec,
      resolution
    )

    if (hasAudio && body.audio) {
      videoUrl = await runKlingLipSync(replicate, videoUrl, body.audio)
    }

    return c.json({ ok: true, video: videoUrl })
  } catch (err: unknown) {
    return respondWithReplicateFriendlyError(c, err, 'Photo to Video error')
  }
})

export default phototovideo
