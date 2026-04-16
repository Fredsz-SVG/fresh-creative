/**
 * Pose editing memakai Gemini 2.5 Flash Image di Replicate.
 * Tujuan: ubah pose, tapi pertahankan pakaian/identitas semaksimal mungkin.
 */

import Replicate from 'replicate'
import {
  REPLICATE_GEMINI_FLASH_IMAGE,
  runWith429Retry,
  type GeminiImageInput,
} from './gemini-tryon'
import { getSingleReplicateUrl } from './replicate-output'

type ReplicateClient = InstanceType<typeof Replicate>

function toDataUri(input: GeminiImageInput): string {
  return `data:${input.mimeType};base64,${input.base64}`
}

function extractImageUrl(output: unknown): string {
  if (
    typeof output === 'string' &&
    (output.startsWith('http://') || output.startsWith('https://') || output.startsWith('data:'))
  ) {
    return output
  }
  return getSingleReplicateUrl(output)
}

export async function generatePoseEditGemini(
  replicate: ReplicateClient,
  subject: GeminiImageInput,
  poseInstruction: string
): Promise<string> {
  const instruction =
    (poseInstruction || '').trim() || 'Change the pose to a natural standing pose.'
  const prompt = `Edit the provided photo to change ONLY the person's pose.

Target pose instruction:
${instruction}

CRITICAL CONSTRAINTS (must follow):
1) Preserve identity: face, hair, skin tone, body shape, and age must remain the same.
2) Preserve outfit EXACTLY: clothing type, colors, patterns, logos, textures, accessories, and layering must remain unchanged.
3) Preserve background and lighting as much as possible.
4) Do NOT change the person's outfit, do NOT restyle, do NOT replace clothing.
5) Keep the result photorealistic.`

  const output = await runWith429Retry(
    () =>
      replicate.run(REPLICATE_GEMINI_FLASH_IMAGE, {
        input: {
          prompt,
          image_input: [toDataUri(subject)],
          output_format: 'jpg',
        },
      }),
    5
  )

  const url = extractImageUrl(output)
  if (!url) {
    throw new Error(
      'Replicate: model did not return an image URL. Try again with a clearer photo or pose instruction.'
    )
  }
  return url
}
