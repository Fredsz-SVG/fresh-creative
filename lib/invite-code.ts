import { randomBytes } from 'crypto'

/** Alfabet tanpa karakter ambigu (0/O, 1/l/I) agar kode mudah diketik/dibaca */
const SAFE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LEN = 8

/**
 * Generate short invite code (hanya kode, tanpa URL).
 * Default 8 karakter, cukup unik untuk invite per album.
 */
export function generateShortInviteCode(length: number = LEN): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += SAFE_ALPHABET[bytes[i]! % SAFE_ALPHABET.length]
  }
  return code
}

/** Cek apakah string seperti kode undangan (6–12 alphanumeric) */
export function looksLikeShortCode(input: string): boolean {
  const trimmed = input.trim()
  return /^[a-zA-Z0-9]{6,12}$/.test(trimmed)
}
