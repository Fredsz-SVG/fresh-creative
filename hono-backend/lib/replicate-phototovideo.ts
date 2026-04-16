/**
 * Photo → Video: ByteDance Seedance 1 Lite (I2V), opsional Kling Lip Sync dengan audio upload.
 * @see https://replicate.com/bytedance/seedance-1-lite
 * @see https://replicate.com/kwaivgi/kling-lip-sync
 */

import Replicate from 'replicate'
import { getSingleReplicateUrl } from './replicate-output'
import { runWith429Retry } from './gemini-tryon'

type ReplicateClient = InstanceType<typeof Replicate>

export const SEEDANCE_LITE_MODEL = 'bytedance/seedance-1-lite'
export const KLING_LIP_SYNC_MODEL = 'kwaivgi/kling-lip-sync'

/** Tanpa audio: tier lite (API mendukung 480p / 720p; 590p tidak tercantum eksplisit → pakai 480p). */
export const SEEDANCE_RESOLUTION_LITE = '480p'
/** Dengan audio: lip-sync Kling umumnya membutuhkan video cukup HD — pakai 720p. */
export const SEEDANCE_RESOLUTION_FOR_LIPSYNC = '720p'

const MAX_AUDIO_BYTES = 5 * 1024 * 1024

export function validateAudioFileSize(size: number): boolean {
  return size > 0 && size <= MAX_AUDIO_BYTES
}

/**
 * Prompt motion: pertahankan pakaian & penampilan; hanya gerak/ekspresi sesuai user.
 */
export function buildPhotoToVideoPrompt(userMotionPrompt: string): string {
  const motion =
    userMotionPrompt.trim() ||
    'Natural subtle movement: breathing, slight head motion, soft eye contact with camera.'
  return `IMPORTANT — Preserve the subject's clothing, colors, patterns, accessories, and overall appearance exactly as in the source photo. Do NOT change outfit, do NOT add or remove garments, do NOT recolor fabric.

Motion and performance only (keep the same clothes and identity):
${motion}

Photorealistic lighting consistent with the photo. Single continuous take feel.`
}

export async function runSeedanceImageToVideo(
  replicate: ReplicateClient,
  imageDataUri: string,
  prompt: string,
  /** Seedance API: duration integer, typically 2–12 seconds */
  durationSec: number,
  resolution: string
): Promise<string> {
  const output = await runWith429Retry(
    () =>
      replicate.run(SEEDANCE_LITE_MODEL, {
        input: {
          image: imageDataUri,
          prompt,
          duration: durationSec,
          resolution,
          fps: 24,
          camera_fixed: false,
        },
      }),
    5
  )
  const url = getSingleReplicateUrl(output)
  if (!url) {
    throw new Error('Replicate: Seedance did not return a video URL.')
  }
  return url
}

/**
 * Sinkronkan bibir dengan audio. Input: URL video dari Seedance + data URI audio.
 */
export async function runKlingLipSync(
  replicate: ReplicateClient,
  videoUrl: string,
  audioDataUri: string
): Promise<string> {
  const output = await runWith429Retry(
    () =>
      replicate.run(KLING_LIP_SYNC_MODEL, {
        input: {
          video: videoUrl,
          audio: audioDataUri,
        },
      }),
    5
  )
  const url = getSingleReplicateUrl(output)
  if (!url) {
    throw new Error('Replicate: Kling lip-sync did not return a video URL.')
  }
  return url
}
