/**
 * Helpers for AI feature routes: clients send multipart/form-data with File fields,
 * while JSON callers send data URIs / URLs in the body.
 */

import type { Context } from 'hono'

export function requestIsMultipart(c: Context): boolean {
  const ct = c.req.header('content-type') ?? ''
  return ct.includes('multipart/form-data')
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function fileToDataUri(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const mime = file.type || 'image/jpeg'
  return `data:${mime};base64,${arrayBufferToBase64(buf)}`
}

export function formDataString(fd: FormData, key: string): string | undefined {
  const v = fd.get(key)
  return typeof v === 'string' ? v : undefined
}
